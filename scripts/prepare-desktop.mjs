import {
  cpSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeDir = join(projectDir, "src-tauri", "runtime");
const appDir = join(runtimeDir, "app");
const rootPackage = JSON.parse(
  readFileSync(join(projectDir, "package.json"), "utf8"),
);
const serverPackages = [
  "bcryptjs",
  "better-sqlite3",
  "express",
  "express-session",
  "helmet",
  "multer",
  "qrcode",
  "socket.io",
  "zod",
];

execFileSync(
  process.execPath,
  [
    join(projectDir, "node_modules", "vite", "bin", "vite.js"),
    "build",
    "--configLoader",
    "runner",
  ],
  {
    cwd: projectDir,
    stdio: "inherit",
  },
);

rmSync(runtimeDir, { recursive: true, force: true });
mkdirSync(appDir, { recursive: true });
copyFileSync(process.execPath, join(runtimeDir, "node.exe"));
copyFileSync(join(projectDir, "main.js"), join(appDir, "main.js"));
cpSync(join(projectDir, "public"), join(appDir, "public"), { recursive: true });

const runtimePackage = {
  name: "sanlycontrol-runtime",
  version: rootPackage.version,
  private: true,
  type: "module",
  dependencies: Object.fromEntries(
    serverPackages.map((name) => [name, rootPackage.dependencies[name]]),
  ),
};
writeFileSync(
  join(appDir, "package.json"),
  `${JSON.stringify(runtimePackage, null, 2)}\n`,
);
writeFileSync(
  join(appDir, "pnpm-workspace.yaml"),
  "onlyBuiltDependencies:\n  - better-sqlite3\n",
);

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const install = spawnSync(
  pnpmCommand,
  ["install", "--prod", "--config.node-linker=hoisted"],
  { cwd: appDir, stdio: "inherit", shell: process.platform === "win32" },
);
if (
  install.status !== 0 &&
  !existsSync(join(appDir, "node_modules", "express"))
) {
  throw new Error("Masaüstü hyzmatynyň baglylyklary gurnalyp bilinmedi.");
}
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
execFileSync(
  npmCommand,
  ["rebuild", "better-sqlite3", "--foreground-scripts"],
  {
    cwd: appDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

console.log("SanlyControl masaüstü hyzmaty taýýarlandy.");
