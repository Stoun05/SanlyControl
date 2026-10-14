import http from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { setTimeout as delay } from "node:timers/promises";

const port = Number(process.env.SANLYCONTROL_CARGO_BRIDGE_PORT || 48721);
const indexCache = new Map();
let apiQueue = Promise.resolve();

function queueApi(task) {
  const run = apiQueue.then(async () => {
    await delay(300);
    return task();
  });
  apiQueue = run.catch(() => undefined);
  return run;
}

async function fetchRetry(url) {
  let lastError;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const execute = () =>
        fetch(url, {
          headers: { "user-agent": "SanlyControl-build (local packaging)" },
          signal: AbortSignal.timeout(60_000),
        });
      const result = url.startsWith("https://crates.io/api/")
        ? await queueApi(execute)
        : await execute();
      if (result.status === 429) {
        await delay(10_000);
        throw new Error(`429 ${url}`);
      }
      if (!result.ok) throw new Error(`${result.status} ${url}`);
      return result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function createIndex(crateName) {
  if (indexCache.has(crateName)) return indexCache.get(crateName);
  const metadata = await (await fetchRetry(`https://crates.io/api/v1/crates/${crateName}`)).json();
  const grouped = new Map();
  for (const version of metadata.versions) {
    if (version.yanked || version.num.includes("-")) continue;
    const [major, minor] = version.num.split(".");
    const compatibilityLine = major === "0" ? `${major}.${minor}` : major;
    if (!grouped.has(compatibilityLine)) grouped.set(compatibilityLine, version);
  }
  if (!grouped.size && metadata.versions[0]) grouped.set("latest", metadata.versions[0]);

  const selectedVersions = [...grouped.values()].slice(0, 12);
  const records = await Promise.all(
    selectedVersions.map(async (version) => {
      const dependencyData = await (
        await fetchRetry(`https://crates.io${version.links.dependencies}`)
      ).json();
      const featureNames = new Set(Object.keys(version.features || {}));
      const dependencyNames = new Set(dependencyData.dependencies.map((item) => item.crate_id));
      const referencedNames = new Set(
        Object.values(version.features || {})
          .flat()
          .filter((item) => item.includes("/") || item.startsWith("dep:"))
          .map((item) => item.replace(/^dep:/, "").split(/[/?]/)[0])
          .filter((item) => item && !featureNames.has(item) && !dependencyNames.has(item)),
      );
      const aliases = new Map();
      for (const alias of referencedNames) {
        const candidates = dependencyData.dependencies.filter((item) => {
          if (alias === "ffi") {
            const directFfi = dependencyData.dependencies.some(
              (candidate) => candidate.crate_id === `${crateName}-sys`,
            );
            return directFfi
              ? item.crate_id === `${crateName}-sys`
              : item.crate_id.endsWith("-sys");
          }
          if (alias === "macros") return item.crate_id.endsWith("-macros");
          if (alias.replace(/[_-]crate$/, "") === item.crate_id) return true;
          return item.crate_id.includes(alias);
        });
        if (candidates.length === 1) aliases.set(candidates[0].crate_id, alias);
      }
      const dependencies = dependencyData.dependencies.map((dependency) => ({
        name: aliases.get(dependency.crate_id) || dependency.crate_id,
        req: dependency.req,
        features: dependency.features || [],
        optional: Boolean(dependency.optional),
        default_features: dependency.default_features !== false,
        target: dependency.target || null,
        kind: dependency.kind || "normal",
        registry: null,
        ...(aliases.has(dependency.crate_id) ? { package: dependency.crate_id } : {}),
      }));
      return {
        name: crateName,
        vers: version.num,
        deps: dependencies,
        cksum: version.checksum,
        features: {},
        features2: version.features || {},
        yanked: Boolean(version.yanked),
        links: version.lib_links || null,
        rust_version: version.rust_version || null,
        v: 2,
      };
    }),
  );
  const output = `${records.reverse().map((record) => JSON.stringify(record)).join("\n")}\n`;
  indexCache.set(crateName, output);
  return output;
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.url === "/index/config.json") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ dl: `http://127.0.0.1:${port}/crates`, api: "https://crates.io" }));
      return;
    }

    if (request.url.startsWith("/index/")) {
      const crateName = decodeURIComponent(request.url.split("/").at(-1));
      console.log(`INDEX ${crateName}`);
      response.setHeader("content-type", "text/plain");
      response.end(await createIndex(crateName));
      return;
    }

    if (!request.url.startsWith("/crates/")) {
      response.writeHead(404).end();
      return;
    }

    const remoteUrl = `https://crates.io/api/v1/crates/${request.url.slice(8)}`;
    console.log(`${request.method} ${remoteUrl}`);
    const remote = await fetchRetry(remoteUrl);
    response.statusCode = remote.status;
    for (const header of ["content-type", "content-length", "etag", "last-modified"]) {
      const value = remote.headers.get(header);
      if (value) response.setHeader(header, value);
    }
    if (remote.body) await pipeline(Readable.fromWeb(remote.body), response);
    else response.end();
  } catch (error) {
    response.statusCode = 502;
    response.end(String(error));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Cargo HTTP bridge: http://127.0.0.1:${port}`);
});
