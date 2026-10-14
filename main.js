import express from "express";
import session from "express-session";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import QRCode from "qrcode";
import multer from "multer";
import { z } from "zod";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, copyFileSync, existsSync, unlinkSync } from "node:fs";
import { Server } from "socket.io";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.SANLYCONTROL_DATA_DIR || join(ROOT, "data");
const UPLOAD_DIR = join(DATA_DIR, "uploads");
mkdirSync(UPLOAD_DIR, { recursive: true });

const pendingRestore = join(DATA_DIR, "restore-ready.db");
if (existsSync(pendingRestore)) {
  copyFileSync(pendingRestore, join(DATA_DIR, "sanlycontrol.db"));
  unlinkSync(pendingRestore);
}

const db = new Database(join(DATA_DIR, "sanlycontrol.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, display_name TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, short_name TEXT NOT NULL, color TEXT NOT NULL, description TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY, subject_id INTEGER NOT NULL REFERENCES subjects(id), title TEXT NOT NULL, topic TEXT NOT NULL, objective TEXT NOT NULL, difficulty TEXT NOT NULL DEFAULT 'Orta', content_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS assessments (id INTEGER PRIMARY KEY, subject_id INTEGER NOT NULL REFERENCES subjects(id), title TEXT NOT NULL, duration_minutes INTEGER NOT NULL DEFAULT 20, shuffle_questions INTEGER NOT NULL DEFAULT 0, shuffle_answers INTEGER NOT NULL DEFAULT 0, allow_retry INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY, assessment_id INTEGER NOT NULL REFERENCES assessments(id), type TEXT NOT NULL, prompt TEXT NOT NULL, options_json TEXT NOT NULL DEFAULT '[]', answer_json TEXT NOT NULL DEFAULT 'null', points REAL NOT NULL DEFAULT 1, explanation TEXT NOT NULL DEFAULT '', topic TEXT NOT NULL DEFAULT '');
  CREATE TABLE IF NOT EXISTS live_sessions (id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, teacher_id INTEGER NOT NULL REFERENCES users(id), subject_id INTEGER NOT NULL REFERENCES subjects(id), lesson_id INTEGER REFERENCES lessons(id), assessment_id INTEGER REFERENCES assessments(id), title TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'lesson', allow_join INTEGER NOT NULL DEFAULT 1, started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, ends_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS participants (id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE, student_key TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'connected', joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(session_id, student_key));
  CREATE TABLE IF NOT EXISTS submissions (id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE, participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'in_progress', started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, submitted_at TEXT, score REAL NOT NULL DEFAULT 0, max_score REAL NOT NULL DEFAULT 0, manual_pending INTEGER NOT NULL DEFAULT 0, UNIQUE(session_id, participant_id));
  CREATE TABLE IF NOT EXISTS answers (id INTEGER PRIMARY KEY, submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE, question_id INTEGER NOT NULL REFERENCES questions(id), answer_json TEXT NOT NULL, auto_score REAL, manual_score REAL, feedback TEXT NOT NULL DEFAULT '', idempotency_key TEXT UNIQUE NOT NULL, saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(submission_id, question_id));
  CREATE TABLE IF NOT EXISTS grade_audit (id INTEGER PRIMARY KEY, answer_id INTEGER NOT NULL REFERENCES answers(id), old_score REAL, new_score REAL NOT NULL, reason TEXT NOT NULL, changed_by INTEGER NOT NULL REFERENCES users(id), changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
`);

const subjects = [
  [
    "matematika",
    "Matematika",
    "MAT",
    "#6C5CE7",
    "Funksiýalar, geometriýa we logiki pikirlenme",
  ],
  ["fizika", "Fizika", "FIZ", "#00A8A8", "Hereket, güýç, energiýa we elektrik"],
  ["himiya", "Himiýa", "HIM", "#E17055", "Atomlar, molekulalar we reaksiýalar"],
  [
    "biologiya",
    "Biologiýa",
    "BIO",
    "#2EAD72",
    "Öýjük, genetika we ýaşaýyş ulgamlary",
  ],
  [
    "informatika",
    "Informatika",
    "INF",
    "#3478F6",
    "Algoritmler, maglumatlar we programmirleme",
  ],
];

const lessonSeed = {
  matematika: [
    "Kwadrat funksiýanyň grafigi",
    "Parametrler üýtgände parabolanyň ýerleşişini derňemek",
    "graph",
  ],
  fizika: [
    "Hereketiň kanunlary",
    "Tizlik, wagt we aralyk arasyndaky baglanyşygy tejribe arkaly görmek",
    "motion",
  ],
  himiya: [
    "Himiki reaksiýany deňlemek",
    "Atomlaryň sanyny deňeşdirip koeffisiýentleri tapmak",
    "reaction",
  ],
  biologiya: [
    "Öýjügiň gurluşy",
    "Öýjük organoidlerini tanamak we olaryň wezipesini düşündirmek",
    "cell",
  ],
  informatika: [
    "Saýlama algoritmi",
    "Şertiň algoritmiň akymyna edýän täsirini synlamak",
    "algorithm",
  ],
};

const questionSeed = {
  matematika: [
    [
      "choice",
      "f(x)=x² funksiýasynyň grafigi nähili atlandyrylýar?",
      ["Parabola", "Giperbola", "Göni çyzyk", "Töwerek"],
      "Parabola",
      "Kwadrat funksiýanyň grafigi paraboladyr.",
    ],
    ["numeric", "3² + 4² näçe?", [], 25, "3²+4²=9+16=25."],
    [
      "choice",
      "y=2x+1 funksiýasynda burç koeffisiýenti näçe?",
      ["1", "2", "-1", "0"],
      "2",
      "x-iň öňündäki san burç koeffisiýentidir.",
    ],
    [
      "choice",
      "Üçburçlugyň içki burçlarynyň jemi?",
      ["90°", "180°", "270°", "360°"],
      "180°",
      "Islendik üçburçlukda jem 180°-dyr.",
    ],
    [
      "short",
      "x+7=12 deňlemäniň çözüwini ýaz.",
      [],
      "5",
      "Iki tarapdan 7 aýrylýar.",
    ],
    [
      "numeric",
      "Radiusy 3 bolan tegelegiň diametri näçe?",
      [],
      6,
      "Diametr radiusyň iki essesidir.",
    ],
    [
      "choice",
      "Haýsy san ýönekeý san?",
      ["9", "15", "17", "21"],
      "17",
      "17 diňe 1-e we özüne bölünýär.",
    ],
    ["numeric", "200-iň 15%-i näçe?", [], 30, "200×0.15=30."],
    [
      "choice",
      "|−8| näçe?",
      ["−8", "0", "8", "16"],
      "8",
      "Modul sanyň noldan aralygydyr.",
    ],
    [
      "open",
      "Kwadrat funksiýanyň gündelik durmuşdaky bir ulanylyşyny düşündir.",
      [],
      null,
      "Jogap mysal we düşündiriş boýunça mugallym tarapyndan barlanýar.",
    ],
  ],
  fizika: [
    [
      "choice",
      "Tizligiň SI birligi haýsy?",
      ["m/s", "km", "N", "J"],
      "m/s",
      "Tizlik aralyk/wagt hökmünde m/s bilen ölçenýär.",
    ],
    [
      "numeric",
      "120 m ýoly 10 s-da geçen jisimiň tizligi?",
      [],
      12,
      "v=s/t=120/10=12 m/s.",
    ],
    [
      "choice",
      "Güýjüň birligi?",
      ["Watt", "Paskal", "Nýuton", "Joul"],
      "Nýuton",
      "Güýç Nýuton bilen ölçenýär.",
    ],
    [
      "choice",
      "Ýeriň çekiş güýji jisime haýsy tarapa täsir edýär?",
      ["Ýokary", "Ýeriň merkezine", "Gapdala", "Täsir etmeýär"],
      "Ýeriň merkezine",
      "Agyrlyk güýji Ýeriň merkezine gönükýär.",
    ],
    ["numeric", "m=2 kg, a=3 m/s² bolsa F näçe?", [], 6, "F=ma=6 N."],
    [
      "choice",
      "Energiýanyň SI birligi?",
      ["Joul", "Nýuton", "Watt", "Volt"],
      "Joul",
      "Energiýa Joul bilen ölçenýär.",
    ],
    [
      "short",
      "Elektrik togunyň güýjüniň birligini ýaz.",
      [],
      "amper",
      "Tok güýji amper bilen ölçenýär.",
    ],
    [
      "choice",
      "Ses haýsy gurşawda ýaýrap bilmeýär?",
      ["Howada", "Suwda", "Wakuumda", "Metalda"],
      "Wakuumda",
      "Ses üçin maddy gurşaw gerek.",
    ],
    [
      "numeric",
      "10 N güýç jisimi 5 m süýşürse edilen iş?",
      [],
      50,
      "A=Fs=50 J.",
    ],
    [
      "open",
      "Inersiýa hadysasyna durmuşdan bir mysal getir.",
      [],
      null,
      "Mysal we fiziki düşündiriş mugallym tarapyndan barlanýar.",
    ],
  ],
  himiya: [
    [
      "choice",
      "Suwuň formulasy?",
      ["CO₂", "H₂O", "O₂", "NaCl"],
      "H₂O",
      "Bir molekulada iki H we bir O atomy bar.",
    ],
    [
      "choice",
      "O kislorodyň atom belgisi?",
      ["6", "7", "8", "16"],
      "8",
      "Kislorod periodik tablisada 8-nji elementdir.",
    ],
    [
      "numeric",
      "2H₂ molekulasynda näçe wodorod atomy bar?",
      [],
      4,
      "2×2=4 atom.",
    ],
    [
      "choice",
      "pH=2 bolan ergin nähili?",
      ["Turşy", "Aşgar", "Bitarap", "Duz"],
      "Turşy",
      "pH 7-den kiçi bolsa ergin turşudyr.",
    ],
    [
      "short",
      "Nahar duzunyň formulasyny ýaz.",
      [],
      "NaCl",
      "Natriý hlorid — NaCl.",
    ],
    [
      "choice",
      "Haýsy proses himiki üýtgeşme?",
      [
        "Buzuň eremegi",
        "Suwuň gaýnamagy",
        "Demriň poslamagy",
        "Şekeriň eremegi",
      ],
      "Demriň poslamagy",
      "Poslamada täze madda emele gelýär.",
    ],
    [
      "numeric",
      "CO₂ molekulasynda jemi näçe atom bar?",
      [],
      3,
      "1 C + 2 O = 3 atom.",
    ],
    [
      "choice",
      "Elementiň häsiýetini saklaýan iň kiçi bölejik?",
      ["Atom", "Öýjük", "Ion bagy", "Ergin"],
      "Atom",
      "Atom elementiň esasy bölejigidir.",
    ],
    [
      "choice",
      "Kislorod ýanmagy nähili goldaýar?",
      ["Söndürýär", "Goldaýar", "Täsir etmeýär", "Doňdurýar"],
      "Goldaýar",
      "Kislorod köp ýanma reaksiýalaryna gatnaşýar.",
    ],
    [
      "open",
      "Massa saklanma kanunyny öz sözleriň bilen düşündir.",
      [],
      null,
      "Reaksiýadan öňki we soňky umumy massa deňdir.",
    ],
  ],
  biologiya: [
    [
      "choice",
      "Öýjügiň dolandyryş merkezi?",
      ["Ýadro", "Ribosoma", "Membrana", "Wakuol"],
      "Ýadro",
      "Ýadro genetiki maglumaty saklaýar.",
    ],
    [
      "choice",
      "Fotosintez haýsy organoidde geçýär?",
      ["Mitohondriýa", "Hloroplast", "Ýadro", "Lizozoma"],
      "Hloroplast",
      "Hloroplast hlorofill saklaýar.",
    ],
    [
      "short",
      "Adamyň dem alyş organyny ýaz.",
      [],
      "öýken",
      "Esasy dem alyş organy öýkendir.",
    ],
    [
      "choice",
      "Gan haýsy dokuma degişlidir?",
      ["Birleşdiriji", "Myşsa", "Nerw", "Örtüji"],
      "Birleşdiriji",
      "Gan suwuk birleşdiriji dokumadyr.",
    ],
    [
      "numeric",
      "Adamyň ýüreginde näçe kamera bar?",
      [],
      4,
      "Iki gulakçadan we iki garynjykdan ybarat.",
    ],
    [
      "choice",
      "DNK-nyň esasy wezipesi?",
      [
        "Energiýa öndürmek",
        "Genetiki maglumat saklamak",
        "Iýmit siňdirmek",
        "Gan daşamak",
      ],
      "Genetiki maglumat saklamak",
      "DNK nesil maglumatyny saklaýar.",
    ],
    [
      "choice",
      "Ösümlik öýjüginde bolup, haýwan öýjüginde bolmaýan gurluş?",
      ["Ýadro", "Membrana", "Hloroplast", "Sitoplazma"],
      "Hloroplast",
      "Hloroplast ösümliklere mahsusdyr.",
    ],
    [
      "short",
      "Janly-jandarlaryň iň kiçi gurluş birligi?",
      [],
      "öýjük",
      "Öýjük ýaşaýşyň esasy gurluş birligidir.",
    ],
    [
      "choice",
      "Haýsy ulgam kislorody beden boýunça daşaýar?",
      ["Gan aýlanyş", "Iýmit siňdiriş", "Nerw", "Endokrin"],
      "Gan aýlanyş",
      "Gan kislorody öýjüklere ýetirýär.",
    ],
    [
      "open",
      "Fotosinteziň Ýerdäki ýaşaýyş üçin ähmiýetini düşündir.",
      [],
      null,
      "Kislorod, organiki madda we energiýa akymy agzalmalydyr.",
    ],
  ],
  informatika: [
    [
      "choice",
      "Algoritm näme?",
      [
        "Ädimleriň tertipli toplumy",
        "Diňe programma dili",
        "Kompýuteriň bölegi",
        "Surat faýly",
      ],
      "Ädimleriň tertipli toplumy",
      "Algoritm meseläni çözýän anyk ädimlerdir.",
    ],
    [
      "choice",
      "Haýsy maglumat görnüşi diňe iki ýagdaý alýar?",
      ["Setir", "Boolean", "Sanaw", "Surat"],
      "Boolean",
      "Boolean true/false bahalaryny alýar.",
    ],
    [
      "numeric",
      "Ikilik ulgamdaky 101 sany onluk ulgamda näçe?",
      [],
      5,
      "1×4+0×2+1×1=5.",
    ],
    [
      "short",
      "HTML-de iň uly başlyk tegini ýaz.",
      [],
      "h1",
      "Iň uly semantik başlyk <h1>-dir.",
    ],
    [
      "choice",
      "Gaýtalanýan ädimler üçin näme ulanylýar?",
      ["Sikl", "Faýl", "Piksel", "Hyzmat ediji kompýuter"],
      "Sikl",
      "Sikl buýruklary gaýtalaýar.",
    ],
    [
      "choice",
      "Haýsy biri giriş enjamy?",
      ["Monitor", "Printer", "Klawiatura", "Kolonka"],
      "Klawiatura",
      "Klawiatura maglumat girizýär.",
    ],
    ["numeric", "8 bit näçe baýt?", [], 1, "1 baýt = 8 bit."],
    [
      "choice",
      "Şert operatorynyň esasy maksady?",
      ["Saýlaw etmek", "Surat çekmek", "Faýl gysmak", "Ses çykarmak"],
      "Saýlaw etmek",
      "Şert netijesine görä dürli ýol saýlanýar.",
    ],
    [
      "short",
      "Tor sahypasynyň daşky görnüşini ýazmak üçin ulanylýan dili ýaz.",
      [],
      "CSS",
      "CSS sahypanyň daşky görnüşini dolandyrýar.",
    ],
    [
      "open",
      "Güýçli parolyň azyndan üç alamatyny düşündir.",
      [],
      null,
      "Uzynlyk, dürlülik, özboluşlylyk ýaly ölçegler garaşylýar.",
    ],
  ],
};

function seed() {
  const adminHash = bcrypt.hashSync("admin", 12);
  const admin = db.prepare("SELECT id FROM users WHERE username='admin'").get();
  const legacyTeacher = db
    .prepare("SELECT id FROM users WHERE username='mugallym'")
    .get();
  if (admin) {
    db.prepare(
      "UPDATE users SET password_hash=?, role='teacher', display_name='Ulgam dolandyryjysy' WHERE id=?",
    ).run(adminHash, admin.id);
  } else if (legacyTeacher) {
    db.prepare(
      "UPDATE users SET username='admin', password_hash=?, role='teacher', display_name='Ulgam dolandyryjysy' WHERE id=?",
    ).run(adminHash, legacyTeacher.id);
  } else {
    db.prepare(
      "INSERT INTO users (username,password_hash,role,display_name) VALUES (?,?,?,?)",
    ).run("admin", adminHash, "teacher", "Ulgam dolandyryjysy");
  }
  const insertSubject = db.prepare(
    "INSERT OR IGNORE INTO subjects (slug,name,short_name,color,description) VALUES (?,?,?,?,?)",
  );
  for (const s of subjects) insertSubject.run(...s);
  if (!db.prepare("SELECT 1 FROM lessons LIMIT 1").get()) {
    const insertLesson = db.prepare(
      "INSERT INTO lessons (subject_id,title,topic,objective,difficulty,content_json) VALUES (?,?,?,?,?,?)",
    );
    const insertAssessment = db.prepare(
      "INSERT INTO assessments (subject_id,title,duration_minutes,shuffle_questions,shuffle_answers) VALUES (?,?,?,?,?)",
    );
    const insertQuestion = db.prepare(
      "INSERT INTO questions (assessment_id,type,prompt,options_json,answer_json,points,explanation,topic) VALUES (?,?,?,?,?,?,?,?)",
    );
    for (const [slug] of subjects) {
      const subject = db
        .prepare("SELECT * FROM subjects WHERE slug=?")
        .get(slug);
      const [title, objective, interactive] = lessonSeed[slug];
      insertLesson.run(
        subject.id,
        title,
        title,
        objective,
        "Orta",
        JSON.stringify({
          interactive,
          sections: ["Giriş", "Düşündiriş", "Tejribe", "Netije"],
        }),
      );
      const assessmentId = Number(
        insertAssessment.run(
          subject.id,
          `${subject.name}: barlag işi`,
          20,
          0,
          1,
        ).lastInsertRowid,
      );
      for (const [type, prompt, options, answer, explanation] of questionSeed[
        slug
      ])
        insertQuestion.run(
          assessmentId,
          type,
          prompt,
          JSON.stringify(options),
          JSON.stringify(answer),
          type === "open" ? 3 : 1,
          explanation,
          title,
        );
    }
  }
}
seed();

const app = express();
const server = createServer(app);
const io = new Server(server, { serveClient: true });
const PORT = Number(process.env.PORT || 3000);
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "sanlycontrol-local-classroom-2026",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 12 * 60 * 60 * 1000 },
});
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'"],
        "style-src": ["'self'"],
        "img-src": ["'self'", "data:"],
        "media-src": ["'self'", "blob:"],
        "connect-src": ["'self'", "ws:", "wss:"],
      },
    },
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(sessionMiddleware);
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(join(ROOT, "public")));

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 100 * 1024 * 1024 },
});
const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const requireTeacher = (req, res, next) =>
  req.session.user?.role === "teacher"
    ? next()
    : res.status(401).json({ error: "Mugallym hökmünde giriň." });
const parseJSON = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
const publicBaseUrl = (req) =>
  `${req.protocol}://${req.get("host") || `localhost:${PORT}`}`;

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from(
      { length: 6 },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");
  } while (db.prepare("SELECT 1 FROM live_sessions WHERE code=?").get(code));
  return code;
}

function sessionDetail(id) {
  const live = db
    .prepare(
      `SELECT ls.*,s.name subject_name,s.slug subject_slug,s.color subject_color,l.title lesson_title,a.title assessment_title,a.duration_minutes FROM live_sessions ls JOIN subjects s ON s.id=ls.subject_id LEFT JOIN lessons l ON l.id=ls.lesson_id LEFT JOIN assessments a ON a.id=ls.assessment_id WHERE ls.id=?`,
    )
    .get(id);
  return live
    ? {
        ...live,
        allow_join: Boolean(live.allow_join),
        participant_count: db
          .prepare("SELECT COUNT(*) n FROM participants WHERE session_id=?")
          .get(id).n,
      }
    : null;
}

function gradeQuestion(question, value) {
  const expected = parseJSON(question.answer_json);
  if (["open", "practical"].includes(question.type))
    return { score: null, pending: true };
  if (question.type === "numeric") {
    const actual = Number(String(value).replace(",", "."));
    return {
      score:
        Number.isFinite(actual) && Math.abs(actual - Number(expected)) < 0.001
          ? question.points
          : 0,
      pending: false,
    };
  }
  const normalize = (v) =>
    String(v ?? "")
      .trim()
      .toLocaleLowerCase("tk");
  return {
    score: normalize(value) === normalize(expected) ? question.points : 0,
    pending: false,
  };
}

function finalizeSubmission(submissionId) {
  const totals = db
    .prepare(
      "SELECT COALESCE(SUM(COALESCE(manual_score,auto_score,0)),0) score,SUM(CASE WHEN auto_score IS NULL AND manual_score IS NULL THEN 1 ELSE 0 END) pending FROM answers WHERE submission_id=?",
    )
    .get(submissionId);
  db.prepare(
    "UPDATE submissions SET status='submitted',submitted_at=COALESCE(submitted_at,CURRENT_TIMESTAMP),score=?,manual_pending=? WHERE id=?",
  ).run(totals.score, totals.pending, submissionId);
  return totals;
}

function finalizeExpiredSessions() {
  const expired = db
    .prepare(
      "SELECT id FROM live_sessions WHERE state='assessment' AND ends_at IS NOT NULL AND datetime(ends_at) <= datetime('now')",
    )
    .all();
  for (const live of expired) {
    db.transaction(() => {
      for (const sub of db
        .prepare(
          "SELECT id FROM submissions WHERE session_id=? AND status!='submitted'",
        )
        .all(live.id))
        finalizeSubmission(sub.id);
      db.prepare("UPDATE live_sessions SET state='review' WHERE id=?").run(
        live.id,
      );
    })();
    io.to(`session:${live.id}`).emit("session:changed", sessionDetail(live.id));
  }
}
setInterval(finalizeExpiredSessions, 1000).unref();

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", product: "SanlyControl", serverTime: Date.now() }),
);
app.post("/api/auth/login", (req, res) => {
  const parsed = z
    .object({ username: z.string().min(1), password: z.string().min(1) })
    .safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Ulanyjy adyny we paroly giriziň." });
  const user = db
    .prepare("SELECT * FROM users WHERE username=?")
    .get(parsed.data.username);
  if (!user || !bcrypt.compareSync(parsed.data.password, user.password_hash))
    return res.status(401).json({ error: "Ulanyjy ady ýa-da parol nädogry." });
  req.session.user = {
    id: user.id,
    role: user.role,
    displayName: user.display_name,
    username: user.username,
  };
  res.json({ user: req.session.user });
});
app.post("/api/auth/logout", (req, res) =>
  req.session.destroy(() => res.json({ ok: true })),
);
app.get("/api/auth/me", (req, res) =>
  res.json({
    user: req.session.user || null,
    student: req.session.student || null,
  }),
);

app.get("/api/bootstrap", requireTeacher, (req, res) => {
  const allSubjects = db.prepare("SELECT * FROM subjects ORDER BY id").all();
  const lessons = db
    .prepare("SELECT * FROM lessons ORDER BY subject_id,id")
    .all()
    .map((x) => ({ ...x, content: parseJSON(x.content_json, {}) }));
  const assessments = db
    .prepare(
      "SELECT a.*,COUNT(q.id) question_count,COALESCE(SUM(q.points),0) max_points FROM assessments a LEFT JOIN questions q ON q.assessment_id=a.id GROUP BY a.id ORDER BY a.subject_id,a.id",
    )
    .all();
  const sessions = db
    .prepare(
      `SELECT ls.*,s.name subject_name,s.color subject_color,(SELECT COUNT(*) FROM participants p WHERE p.session_id=ls.id) participant_count FROM live_sessions ls JOIN subjects s ON s.id=ls.subject_id ORDER BY ls.id DESC LIMIT 12`,
    )
    .all();
  res.json({
    user: req.session.user,
    subjects: allSubjects,
    lessons,
    assessments,
    sessions,
  });
});

app.post("/api/lessons", requireTeacher, (req, res) => {
  const parsed = z
    .object({
      subjectId: z.number().int(),
      title: z.string().min(3),
      topic: z.string().min(2),
      objective: z.string().min(3),
      difficulty: z.string().default("Orta"),
    })
    .safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "Sapak maglumatlaryny doly giriziň." });
  const x = parsed.data;
  const result = db
    .prepare(
      "INSERT INTO lessons (subject_id,title,topic,objective,difficulty,content_json) VALUES (?,?,?,?,?,?)",
    )
    .run(
      x.subjectId,
      x.title,
      x.topic,
      x.objective,
      x.difficulty,
      JSON.stringify({
        sections: ["Giriş", "Düşündiriş", "Ýumuş", "Netije"],
        interactive: "custom",
      }),
    );
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});
app.post("/api/materials", requireTeacher, upload.single("file"), (req, res) =>
  req.file
    ? res
        .status(201)
        .json({
          url: `/uploads/${req.file.filename}`,
          originalName: req.file.originalname,
          size: req.file.size,
        })
    : res.status(400).json({ error: "Faýl saýlanmady." }),
);

app.post(
  "/api/sessions",
  requireTeacher,
  asyncRoute(async (req, res) => {
    const parsed = z
      .object({
        subjectId: z.number().int(),
        lessonId: z.number().int().nullable(),
        assessmentId: z.number().int().nullable(),
        title: z.string().min(2).max(100),
      })
      .safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Sessiya maglumatlary nädogry." });
    const x = parsed.data,
      code = makeCode();
    const result = db
      .prepare(
        "INSERT INTO live_sessions (code,teacher_id,subject_id,lesson_id,assessment_id,title) VALUES (?,?,?,?,?,?)",
      )
      .run(
        code,
        req.session.user.id,
        x.subjectId,
        x.lessonId,
        x.assessmentId,
        x.title,
      );
    const live = sessionDetail(Number(result.lastInsertRowid)),
      joinUrl = `${publicBaseUrl(req)}/?join=${code}`;
    res
      .status(201)
      .json({
        ...live,
        joinUrl,
        qr: await QRCode.toDataURL(joinUrl, {
          margin: 1,
          width: 320,
          color: { dark: "#10231d", light: "#ffffff" },
        }),
      });
  }),
);

app.get("/api/sessions/:code/public", (req, res) => {
  const row = db
    .prepare(
      `SELECT ls.id,ls.code,ls.title,ls.state,ls.allow_join,s.name subject_name,s.color subject_color,l.title lesson_title FROM live_sessions ls JOIN subjects s ON s.id=ls.subject_id LEFT JOIN lessons l ON l.id=ls.lesson_id WHERE ls.code=?`,
    )
    .get(req.params.code.toUpperCase());
  row
    ? res.json({ ...row, allow_join: Boolean(row.allow_join) })
    : res.status(404).json({ error: "Sessiya tapylmady." });
});

app.post("/api/sessions/:code/join", (req, res) => {
  const name = String(req.body.name || "")
      .trim()
      .slice(0, 60),
    code = req.params.code.toUpperCase();
  const live = db.prepare("SELECT * FROM live_sessions WHERE code=?").get(code);
  if (!live) return res.status(404).json({ error: "Sessiya tapylmady." });
  if (!live.allow_join)
    return res
      .status(403)
      .json({ error: "Täze gatnaşyjylar üçin giriş ýapyk." });
  if (name.length < 2)
    return res.status(400).json({ error: "Adyňyzy giriziň." });
  const studentKey = req.session.student?.studentKey || crypto.randomUUID();
  db.prepare(
    `INSERT INTO participants (session_id,student_key,name) VALUES (?,?,?) ON CONFLICT(session_id,student_key) DO UPDATE SET name=excluded.name,status='connected',last_seen=CURRENT_TIMESTAMP`,
  ).run(live.id, studentKey, name);
  const participant = db
    .prepare("SELECT * FROM participants WHERE session_id=? AND student_key=?")
    .get(live.id, studentKey);
  req.session.student = {
    participantId: participant.id,
    sessionId: live.id,
    studentKey,
    name,
    code,
  };
  io.to(`teacher:${live.id}`).emit("participants:changed");
  res.json({ ok: true, participant, session: sessionDetail(live.id) });
});

app.patch("/api/sessions/:id", requireTeacher, (req, res) => {
  const live = db
    .prepare("SELECT * FROM live_sessions WHERE id=? AND teacher_id=?")
    .get(req.params.id, req.session.user.id);
  if (!live) return res.status(404).json({ error: "Sessiya tapylmady." });
  const state = ["lesson", "assessment", "review", "closed"].includes(
    req.body.state,
  )
    ? req.body.state
    : live.state;
  const allowJoin =
    typeof req.body.allowJoin === "boolean"
      ? Number(req.body.allowJoin)
      : live.allow_join;
  let endsAt = live.ends_at;
  if (state === "assessment" && live.state !== "assessment") {
    const a = db
      .prepare("SELECT duration_minutes FROM assessments WHERE id=?")
      .get(live.assessment_id);
    endsAt = new Date(
      Date.now() + (a?.duration_minutes || 20) * 60000,
    ).toISOString();
  }
  db.prepare(
    "UPDATE live_sessions SET allow_join=?,state=?,ends_at=? WHERE id=?",
  ).run(allowJoin, state, endsAt, live.id);
  io.to(`session:${live.id}`).emit("session:changed", sessionDetail(live.id));
  res.json(sessionDetail(live.id));
});

app.get("/api/sessions/:id/dashboard", requireTeacher, (req, res) => {
  const live = sessionDetail(Number(req.params.id));
  if (!live || live.teacher_id !== req.session.user.id)
    return res.status(404).json({ error: "Sessiya tapylmady." });
  const participants = db
    .prepare(
      `SELECT p.*,sub.id submission_id,sub.status submission_status,sub.score,sub.max_score,sub.manual_pending,(SELECT COUNT(*) FROM answers a WHERE a.submission_id=sub.id) answered_count FROM participants p LEFT JOIN submissions sub ON sub.participant_id=p.id AND sub.session_id=p.session_id WHERE p.session_id=? ORDER BY p.joined_at`,
    )
    .all(live.id);
  res.json({ session: live, participants });
});

app.get("/api/student/current", (req, res) => {
  const student = req.session.student;
  if (!student) return res.status(401).json({ error: "Ilki sessiýa goşulyň." });
  const live = sessionDetail(student.sessionId);
  if (!live) return res.status(404).json({ error: "Sessiya tamamlandy." });
  const lesson = live.lesson_id
    ? db.prepare("SELECT * FROM lessons WHERE id=?").get(live.lesson_id)
    : null;
  let assessment = null,
    questions = [],
    submission = null,
    answers = [];
  if (live.assessment_id) {
    assessment = db
      .prepare("SELECT id,title,duration_minutes FROM assessments WHERE id=?")
      .get(live.assessment_id);
    questions = db
      .prepare(
        "SELECT id,type,prompt,options_json,points,topic FROM questions WHERE assessment_id=? ORDER BY id",
      )
      .all(live.assessment_id)
      .map((q) => ({ ...q, options: parseJSON(q.options_json, []) }));
    submission = db
      .prepare(
        "SELECT * FROM submissions WHERE session_id=? AND participant_id=?",
      )
      .get(live.id, student.participantId);
    if (submission)
      answers = db
        .prepare(
          "SELECT question_id,answer_json,saved_at FROM answers WHERE submission_id=?",
        )
        .all(submission.id)
        .map((a) => ({ ...a, answer: parseJSON(a.answer_json) }));
  }
  res.json({
    student,
    session: live,
    lesson: lesson
      ? { ...lesson, content: parseJSON(lesson.content_json, {}) }
      : null,
    assessment,
    questions,
    submission,
    answers,
    serverTime: Date.now(),
  });
});

app.post("/api/student/answers", (req, res) => {
  const student = req.session.student;
  if (!student) return res.status(401).json({ error: "Sessiya goşulyň." });
  const parsed = z
    .object({
      questionId: z.number().int(),
      answer: z.any(),
      idempotencyKey: z.string().min(8).max(100),
    })
    .safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Jogap maglumaty nädogry." });
  const live = db
    .prepare("SELECT * FROM live_sessions WHERE id=?")
    .get(student.sessionId);
  if (!live || live.state !== "assessment")
    return res.status(409).json({ error: "Synag häzirki wagtda açyk däl." });
  if (live.ends_at && Date.now() >= new Date(live.ends_at).getTime()) {
    finalizeExpiredSessions();
    return res
      .status(409)
      .json({
        error:
          "Synagyň wagty tamamlandy. Merkezi hyzmat soňky saklanan jogaplary kabul etdi.",
      });
  }
  let submission = db
    .prepare(
      "SELECT * FROM submissions WHERE session_id=? AND participant_id=?",
    )
    .get(live.id, student.participantId);
  if (!submission) {
    const max = db
      .prepare(
        "SELECT COALESCE(SUM(points),0) n FROM questions WHERE assessment_id=?",
      )
      .get(live.assessment_id).n;
    const id = Number(
      db
        .prepare(
          "INSERT INTO submissions (session_id,participant_id,max_score) VALUES (?,?,?)",
        )
        .run(live.id, student.participantId, max).lastInsertRowid,
    );
    submission = db.prepare("SELECT * FROM submissions WHERE id=?").get(id);
  }
  if (submission.status === "submitted")
    return res.status(409).json({ error: "Bu iş eýýäm tabşyryldy." });
  const question = db
    .prepare("SELECT * FROM questions WHERE id=? AND assessment_id=?")
    .get(parsed.data.questionId, live.assessment_id);
  if (!question) return res.status(404).json({ error: "Sorag tapylmady." });
  const grade = gradeQuestion(question, parsed.data.answer);
  try {
    db.prepare(
      `INSERT INTO answers (submission_id,question_id,answer_json,auto_score,idempotency_key) VALUES (?,?,?,?,?) ON CONFLICT(submission_id,question_id) DO UPDATE SET answer_json=excluded.answer_json,auto_score=excluded.auto_score,idempotency_key=excluded.idempotency_key,saved_at=CURRENT_TIMESTAMP`,
    ).run(
      submission.id,
      question.id,
      JSON.stringify(parsed.data.answer),
      grade.score,
      parsed.data.idempotencyKey,
    );
  } catch (error) {
    if (String(error.message).includes("idempotency_key"))
      return res.json({ ok: true, duplicate: true });
    throw error;
  }
  io.to(`teacher:${live.id}`).emit("participants:changed");
  res.json({ ok: true, savedAt: new Date().toISOString() });
});

app.post("/api/student/submit", (req, res) => {
  const student = req.session.student;
  if (!student) return res.status(401).json({ error: "Sessiya goşulyň." });
  const sub = db
    .prepare(
      "SELECT * FROM submissions WHERE session_id=? AND participant_id=?",
    )
    .get(student.sessionId, student.participantId);
  if (!sub) return res.status(400).json({ error: "Heniz jogap saklanmady." });
  const totals = finalizeSubmission(sub.id);
  io.to(`teacher:${student.sessionId}`).emit("participants:changed");
  res.json({
    ok: true,
    score: totals.score,
    maxScore: sub.max_score,
    manualPending: totals.pending,
  });
});

app.get("/api/sessions/:id/results", requireTeacher, (req, res) => {
  const live = sessionDetail(Number(req.params.id));
  if (!live || live.teacher_id !== req.session.user.id)
    return res.status(404).json({ error: "Sessiya tapylmady." });
  const rows = db
    .prepare(
      `SELECT sub.id,p.name,sub.status,sub.score,sub.max_score,sub.manual_pending,sub.submitted_at,ROUND(CASE WHEN sub.max_score>0 THEN sub.score*100.0/sub.max_score ELSE 0 END,1) percent FROM submissions sub JOIN participants p ON p.id=sub.participant_id WHERE sub.session_id=? ORDER BY p.name`,
    )
    .all(live.id);
  const mistakes = db
    .prepare(
      `SELECT q.id,q.prompt,q.topic,COUNT(a.id) attempts,SUM(CASE WHEN COALESCE(a.manual_score,a.auto_score,0)<q.points THEN 1 ELSE 0 END) mistakes FROM questions q JOIN assessments ass ON ass.id=q.assessment_id LEFT JOIN answers a ON a.question_id=q.id LEFT JOIN submissions sub ON sub.id=a.submission_id AND sub.session_id=? WHERE ass.id=? GROUP BY q.id ORDER BY mistakes DESC LIMIT 5`,
    )
    .all(live.id, live.assessment_id);
  res.json({ session: live, rows, mistakes });
});

app.get("/api/submissions/:id", requireTeacher, (req, res) => {
  const sub = db
    .prepare(
      `SELECT sub.*,p.name,ls.teacher_id FROM submissions sub JOIN participants p ON p.id=sub.participant_id JOIN live_sessions ls ON ls.id=sub.session_id WHERE sub.id=?`,
    )
    .get(req.params.id);
  if (!sub || sub.teacher_id !== req.session.user.id)
    return res.status(404).json({ error: "Netije tapylmady." });
  const answers = db
    .prepare(
      `SELECT a.*,q.prompt,q.type,q.points,q.answer_json AS expected_json,q.explanation FROM answers a JOIN questions q ON q.id=a.question_id WHERE a.submission_id=? ORDER BY q.id`,
    )
    .all(sub.id)
    .map((a) => ({
      ...a,
      answer: parseJSON(a.answer_json),
      expected: parseJSON(a.expected_json),
    }));
  res.json({ submission: sub, answers });
});

app.post("/api/answers/:id/grade", requireTeacher, (req, res) => {
  const score = Number(req.body.score),
    reason = String(req.body.reason || "").trim();
  const answer = db
    .prepare(
      `SELECT a.*,q.points,ls.teacher_id FROM answers a JOIN questions q ON q.id=a.question_id JOIN submissions sub ON sub.id=a.submission_id JOIN live_sessions ls ON ls.id=sub.session_id WHERE a.id=?`,
    )
    .get(req.params.id);
  if (!answer || answer.teacher_id !== req.session.user.id)
    return res.status(404).json({ error: "Jogap tapylmady." });
  if (
    !Number.isFinite(score) ||
    score < 0 ||
    score > answer.points ||
    reason.length < 3
  )
    return res.status(400).json({ error: "Bal we sebäbi dogry giriziň." });
  const old = answer.manual_score ?? answer.auto_score;
  db.transaction(() => {
    db.prepare("UPDATE answers SET manual_score=?,feedback=? WHERE id=?").run(
      score,
      reason,
      answer.id,
    );
    db.prepare(
      "INSERT INTO grade_audit (answer_id,old_score,new_score,reason,changed_by) VALUES (?,?,?,?,?)",
    ).run(answer.id, old, score, reason, req.session.user.id);
    const total = db
      .prepare(
        "SELECT COALESCE(SUM(COALESCE(manual_score,auto_score,0)),0) score,SUM(CASE WHEN auto_score IS NULL AND manual_score IS NULL THEN 1 ELSE 0 END) pending FROM answers WHERE submission_id=?",
      )
      .get(answer.submission_id);
    db.prepare(
      "UPDATE submissions SET score=?,manual_pending=? WHERE id=?",
    ).run(total.score, total.pending, answer.submission_id);
  })();
  res.json({ ok: true });
});

app.get("/api/sessions/:id/export.csv", requireTeacher, (req, res) => {
  const live = sessionDetail(Number(req.params.id));
  if (!live || live.teacher_id !== req.session.user.id)
    return res.status(404).end();
  const rows = db
    .prepare(
      `SELECT p.name,ls.title,s.name subject_name,sub.score,sub.max_score,ROUND(CASE WHEN sub.max_score>0 THEN sub.score*100.0/sub.max_score ELSE 0 END,1) percent,sub.submitted_at,sub.status,sub.manual_pending FROM submissions sub JOIN participants p ON p.id=sub.participant_id JOIN live_sessions ls ON ls.id=sub.session_id JOIN subjects s ON s.id=ls.subject_id WHERE sub.session_id=?`,
    )
    .all(live.id);
  const headers = [
      "Okuwçy",
      "Topar / sessiýa",
      "Ders",
      "Bal",
      "Iň ýokary bal",
      "Göterim",
      "Tabşyran wagty",
      "Ýagdaý",
      "El bilen barlanjak",
    ],
    esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const csv =
    "\uFEFF" +
    [
      headers,
      ...rows.map((r) => [
        r.name,
        r.title,
        r.subject_name,
        r.score,
        r.max_score,
        r.percent,
        r.submitted_at,
        r.status,
        r.manual_pending,
      ]),
    ]
      .map((row) => row.map(esc).join(","))
      .join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="sanlycontrol-${live.code}.csv"`,
  );
  res.send(csv);
});

app.get("/api/backup", requireTeacher, (req, res) => {
  db.pragma("wal_checkpoint(TRUNCATE)");
  res.download(
    join(DATA_DIR, "sanlycontrol.db"),
    `sanlycontrol-backup-${new Date().toISOString().slice(0, 10)}.db`,
  );
});
app.post(
  "/api/backup/restore",
  requireTeacher,
  upload.single("backup"),
  (req, res) => {
    if (!req.file)
      return res.status(400).json({ error: "Ätiýaçlyk faýly saýlanmady." });
    const check = new Database(req.file.path, { readonly: true }),
      ok = check
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
        )
        .get();
    check.close();
    if (!ok)
      return res
        .status(400)
        .json({ error: "Bu SanlyControl ätiýaçlyk faýly däl." });
    copyFileSync(req.file.path, join(DATA_DIR, "restore-ready.db"));
    res.json({ ok: true, message: "Dikeltme faýly barlandy." });
  },
);

app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
  res.sendFile(join(ROOT, "public", "index.html"));
});
io.engine.use(sessionMiddleware);
io.on("connection", (socket) => {
  const sess = socket.request.session,
    teacher = sess?.user?.role === "teacher" ? sess.user : null,
    student = sess?.student;
  socket.on("classroom:join", ({ sessionId }) => {
    const live = db
      .prepare("SELECT * FROM live_sessions WHERE id=?")
      .get(Number(sessionId));
    if (!live) return;
    if (teacher && live.teacher_id === teacher.id) {
      socket.join(`teacher:${live.id}`);
      socket.join(`session:${live.id}`);
      socket.emit(
        "students:online",
        Array.from(io.sockets.adapter.rooms.get(`students:${live.id}`) || []),
      );
    } else if (student?.sessionId === live.id) {
      socket.join(`students:${live.id}`);
      socket.join(`session:${live.id}`);
      io.to(`teacher:${live.id}`).emit("student:online", {
        socketId: socket.id,
        participantId: student.participantId,
        name: student.name,
      });
    }
  });
  socket.on("screen:request-online", ({ sessionId }) => {
    if (!teacher) return;
    const live = db
      .prepare("SELECT id FROM live_sessions WHERE id=? AND teacher_id=?")
      .get(Number(sessionId), teacher.id);
    if (live)
      socket.emit(
        "students:online",
        Array.from(io.sockets.adapter.rooms.get(`students:${live.id}`) || []),
      );
  });
  socket.on("webrtc:offer", ({ target, sdp }) =>
    io.to(target).emit("webrtc:offer", { from: socket.id, sdp }),
  );
  socket.on("webrtc:answer", ({ target, sdp }) =>
    io.to(target).emit("webrtc:answer", { from: socket.id, sdp }),
  );
  socket.on("webrtc:ice", ({ target, candidate }) =>
    io.to(target).emit("webrtc:ice", { from: socket.id, candidate }),
  );
  socket.on("screen:stopped", ({ sessionId }) =>
    io.to(`session:${Number(sessionId)}`).emit("screen:stopped"),
  );
});
app.use((error, req, res, next) => {
  console.error(error);
  res
    .status(500)
    .json({ error: "Garaşylmadyk ýalňyşlyk ýüze çykdy. Gaýtadan synanyşyň." });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\nSanlyControl taýýar: http://localhost:${PORT}`);
  for (const addresses of Object.values(networkInterfaces()))
    for (const address of addresses ?? [])
      if (address.family === "IPv4" && !address.internal)
        console.log(`Ýerli tor: http://${address.address}:${PORT}`);
  console.log("Dolandyryjy girişi: admin / admin\n");
});
