import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import * as Tabs from "@radix-ui/react-tabs";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Download,
  FlaskConical,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MonitorUp,
  MoreHorizontal,
  Plus,
  QrCode,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { Button } from "./components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./components/ui/dialog";
import { Progress } from "./components/ui/progress";
import { cn } from "./lib/utils";
import "./index.css";

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
};
const stagger = { animate: { transition: { staggerChildren: 0.055 } } };
const rise = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });
  const body = response.headers
    .get("content-type")
    ?.includes("application/json")
    ? await response.json()
    : null;
  if (!response.ok) throw new Error(body?.error || "Amal ýerine ýetmedi.");
  return body;
}

function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3 font-extrabold tracking-[-.03em]">
      <span className="grid size-10 place-items-center rounded-[13px] bg-lime text-base font-black text-ink shadow-[inset_0_0_0_1px_rgba(7,25,21,.12)]">
        S
      </span>
      {!compact && <span>SanlyControl</span>}
    </div>
  );
}
function Eyebrow({ children, className }) {
  return (
    <p
      className={cn(
        "mb-2 text-[11px] font-extrabold uppercase tracking-[.17em] text-teal",
        className,
      )}
    >
      {children}
    </p>
  );
}
function Badge({ children, tone = "neutral", className, ...props }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-600",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    dark: "bg-white/10 text-white",
  };
  return (
    <span
      {...props}
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
function LiveDot({ label = "Ýerli hyzmat işleýär", dark = false }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-semibold",
        dark ? "text-white/80" : "text-ink",
      )}
    >
      <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]" />
      {label}
    </span>
  );
}
function Field({ label, children }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}
const inputClass =
  "min-h-12 w-full rounded-xl border border-line bg-white px-3.5 text-sm shadow-sm outline-none transition focus:border-teal focus:ring-4 focus:ring-teal/10";
function Empty({ children }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-line bg-white/50 p-6 text-center text-sm text-muted">
      {children}
    </div>
  );
}
function notify(message, type = "ok") {
  window.dispatchEvent(
    new CustomEvent("sanly-toast", { detail: { message, type } }),
  );
}
function Toasts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const h = (e) => {
      const id = crypto.randomUUID();
      setItems((v) => [...v, { id, ...e.detail }]);
      setTimeout(() => setItems((v) => v.filter((x) => x.id !== id)), 3600);
    };
    addEventListener("sanly-toast", h);
    return () => removeEventListener("sanly-toast", h);
  }, []);
  return (
    <div className="fixed bottom-5 right-5 z-[100] grid w-[min(360px,calc(100%-2.5rem))] gap-2">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20 }}
            className={cn(
              "rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-2xl",
              t.type === "error" ? "bg-red-700" : "bg-ink",
            )}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Login({ onLogin, onStudent }) {
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const d = Object.fromEntries(new FormData(e.currentTarget));
      await api("/api/auth/login", { method: "POST", body: JSON.stringify(d) });
      onLogin();
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-ink p-3 md:grid md:grid-cols-[1.12fr_.88fr]">
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="noise relative flex min-h-[52vh] flex-col justify-between overflow-hidden rounded-[28px] bg-ink p-7 text-white md:min-h-[calc(100vh-1.5rem)] md:p-[clamp(2rem,6vw,6.5rem)]"
      >
        <span className="orb -right-52 -top-44 size-[520px]" />
        <Brand />
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="relative z-10 max-w-4xl py-16 md:py-8"
        >
          <motion.div variants={rise}>
            <Badge tone="dark">
              <Wifi size={13} /> INTERNET GEREK DÄL
            </Badge>
          </motion.div>
          <motion.h1
            variants={rise}
            className="font-display mt-5 text-[clamp(3rem,7vw,7.8rem)] font-black leading-[.87]"
          >
            Synpyň ritmi.
            <br />
            <span className="text-lime">Seniň eliňde.</span>
          </motion.h1>
          <motion.p
            variants={rise}
            className="mt-7 max-w-2xl text-[clamp(1rem,1.5vw,1.25rem)] leading-8 text-white/65"
          >
            Sapak, janly ekran, synag we derňew. Ähli maglumatlar ýerli torda,
            ähli üns okuw prosesinde.
          </motion.p>
        </motion.div>
        <div className="relative z-10 flex flex-wrap gap-5 text-xs font-medium text-white/70">
          <span className="flex items-center gap-2">
            <Check size={15} className="text-lime" />5 ders
          </span>
          <span className="flex items-center gap-2">
            <Check size={15} className="text-lime" />
            30+ okuwçy
          </span>
          <span className="flex items-center gap-2">
            <Check size={15} className="text-lime" />
            Maglumatlar özüňde
          </span>
        </div>
      </motion.section>
      <section className="grid place-items-center px-4 py-12 md:px-[clamp(2rem,6vw,6rem)]">
        <motion.div {...pageMotion} className="w-full max-w-md">
          <Eyebrow>Mugallym dolandyryşy</Eyebrow>
          <h2 className="font-display text-4xl font-extrabold">
            Hoş geldiňiz.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Şu günki sapagy bir ýerden dolandyryň.
          </p>
          <form onSubmit={submit} className="mt-8 grid gap-4">
            <Field label="Ulanyjy ady">
              <input
                className={inputClass}
                name="username"
                defaultValue="admin"
                autoComplete="username"
              />
            </Field>
            <Field label="Parol">
              <input
                className={inputClass}
                type="password"
                name="password"
                defaultValue="admin"
                autoComplete="current-password"
              />
            </Field>
            <Button size="lg" disabled={busy}>
              {busy ? "Girilýär…" : "Dolandyryşa gir"}
              <ArrowRight size={18} />
            </Button>
          </form>
          <div className="mt-4 rounded-xl border border-line bg-white/55 px-4 py-3 text-xs text-muted">
            Synag girişi: <strong className="text-ink">admin</strong> /{" "}
            <strong className="text-ink">admin</strong>
          </div>
          <Button variant="ghost" className="mt-2 w-full" onClick={onStudent}>
            Okuwçy hökmünde goşul
          </Button>
        </motion.div>
      </section>
    </main>
  );
}

const nav = [
  { id: "overview", label: "Baş sahypa", icon: LayoutDashboard },
  { id: "lessons", label: "Sapaklar", icon: BookOpen },
  { id: "assessments", label: "Synaglar", icon: TestTube2 },
  { id: "results", label: "Netijeler", icon: BarChart3 },
  { id: "settings", label: "Sazlamalar", icon: Settings },
];
function AppShell({
  user,
  view,
  setView,
  onLogout,
  children,
  title = "Dolandyryş merkezi",
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-mist lg:grid lg:grid-cols-[248px_1fr]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-ink p-5 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-9 px-2">
          <Brand />
        </div>
        <nav className="grid gap-1">
          {nav.map((x) => {
            const Icon = x.icon;
            return (
              <button
                key={x.id}
                onClick={() => {
                  setView(x.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition",
                  view === x.id
                    ? "bg-white/10 text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon size={18} />
                {x.label}
                {view === x.id && (
                  <motion.span
                    layoutId="nav-active"
                    className="ml-auto size-1.5 rounded-full bg-lime"
                  />
                )}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 px-2">
            <span className="grid size-10 place-items-center rounded-xl bg-white/10 font-bold text-lime">
              {user.displayName?.[0]}
            </span>
            <div className="min-w-0">
              <strong className="block truncate text-sm">
                {user.displayName}
              </strong>
              <span className="text-[11px] text-white/45">Mugallym</span>
            </div>
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Menýuny ýap"
        />
      )}
      <main className="min-w-0">
        <header className="glass sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-line px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu size={18} />
            </Button>
            <h1 className="text-sm font-bold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LiveDot />
            <Button variant="outline" size="sm" onClick={onLogout}>
              Çyk
            </Button>
          </div>
        </header>
        <div className="mx-auto max-w-[1460px] p-4 pb-16 md:p-8">
          <AnimatePresence mode="wait">{children}</AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function Dashboard({ data, onNew, onOpenSession, setView, setSubject }) {
  const active = data.sessions.filter((s) => s.state !== "closed"),
    total = data.sessions.reduce((n, s) => n + s.participant_count, 0);
  return (
    <motion.div key="overview" {...pageMotion}>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr] xl:items-end">
        <div>
          <Eyebrow>Şu günki synpyň</Eyebrow>
          <h2 className="font-display max-w-4xl text-[clamp(2.7rem,6vw,6rem)] font-black leading-[.9]">
            Okuw işi,
            <br />
            bir ädim öňde.
          </h2>
        </div>
        <div className="max-w-xl xl:pb-2">
          <p className="mb-5 leading-7 text-muted">
            Sapagy taýýarla, okuwçylary birikdir we netijäni şol pursatda gör.
          </p>
          <Button variant="accent" size="lg" onClick={onNew}>
            <Plus size={18} />
            Täze sapak başlat
          </Button>
        </div>
      </div>
      <motion.section
        variants={stagger}
        initial="initial"
        animate="animate"
        className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        {[
          ["Taýýar sapak", data.lessons.length],
          [
            "Sorag banky",
            data.assessments.reduce((n, a) => n + a.question_count, 0),
          ],
          ["Işjeň sessiýa", active.length],
          ["Jemi gatnaşyjy", total],
        ].map(([label, value]) => (
          <motion.div variants={rise} key={label}>
            <Card className="flex min-h-36 flex-col justify-between">
              <span className="text-xs font-semibold text-muted">{label}</span>
              <strong className="font-display text-4xl font-black">
                {value}
              </strong>
            </Card>
          </motion.div>
        ))}
      </motion.section>
      <SectionTitle
        eyebrow="Ders merkezi"
        title="5 ders, bir platforma"
        action={
          <Button variant="outline" onClick={() => setView("lessons")}>
            Ähli sapaklar
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {data.subjects.map((s, i) => (
          <motion.button
            key={s.id}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setSubject(s.id);
              setView("lessons");
            }}
            className="group relative min-h-44 overflow-hidden rounded-2xl p-5 text-left text-white shadow-sm"
            style={{ background: s.color }}
          >
            <span className="absolute -bottom-8 -right-4 text-7xl font-black opacity-10">
              {s.short_name}
            </span>
            <div className="flex h-full flex-col justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-white/15">
                <Sparkles size={17} />
              </span>
              <div>
                <strong className="block text-lg">{s.name}</strong>
                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-white/70">
                  {s.description}
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
      <SectionTitle eyebrow="Soňky işjeňlik" title="Sessiýalar" />
      {data.sessions.length ? (
        <SessionList rows={data.sessions} onOpen={onOpenSession} />
      ) : (
        <Empty>Heniz sessiýa döredilmedi.</Empty>
      )}
    </motion.div>
  );
}
function SectionTitle({ eyebrow, title, action }) {
  return (
    <div className="mb-4 mt-10 flex items-end justify-between gap-4">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="font-display text-2xl font-extrabold">{title}</h2>
      </div>
      {action}
    </div>
  );
}
function SessionList({ rows, onOpen }) {
  return (
    <div className="grid gap-2">
      {rows.map((s) => (
        <motion.button
          layout
          key={s.id}
          whileHover={{ x: 3 }}
          onClick={() => onOpen(s.id)}
          className="grid min-h-20 grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-line bg-white px-5 text-left md:grid-cols-[1.5fr_.7fr_.7fr_auto]"
        >
          <div>
            <strong className="block">{s.title}</strong>
            <span className="mt-1 block text-xs text-muted">
              {s.subject_name}
            </span>
          </div>
          <span className="hidden font-mono text-sm font-black tracking-[.15em] md:block">
            {s.code}
          </span>
          <Badge
            tone={s.state !== "closed" ? "good" : "neutral"}
            className="hidden w-fit md:inline-flex"
          >
            <span className="size-1.5 rounded-full bg-current" />
            {stateLabel(s.state)}
          </Badge>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Users size={15} />
            {s.participant_count}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
function stateLabel(s) {
  return (
    { lesson: "Sapak", assessment: "Synag", review: "Netije", closed: "Ýapyk" }[
      s
    ] || s
  );
}

function Library({ data, selected, setSelected, onCreate }) {
  const sid = selected || data.subjects[0].id,
    lessons = data.lessons.filter((x) => x.subject_id === sid),
    sub = data.subjects.find((x) => x.id === sid);
  return (
    <motion.div key="lessons" {...pageMotion}>
      <Hero
        eyebrow="Mazmun kitaphanasy"
        title={
          <>
            Sapagy döret.
            <br />
            Gaýtadan ulan.
          </>
        }
        action={
          <Button variant="accent" size="lg" onClick={onCreate}>
            <Plus size={18} />
            Täze sapak
          </Button>
        }
      />
      <div className="scrollbar-none my-7 flex gap-2 overflow-auto pb-1">
        {data.subjects.map((s) => (
          <Button
            key={s.id}
            variant={s.id === sid ? "default" : "outline"}
            size="sm"
            onClick={() => setSelected(s.id)}
          >
            {s.name}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {lessons.map((l) => (
          <Card key={l.id} className="group p-6">
            <CardHeader>
              <Badge style={{ color: sub.color }}>{sub.short_name}</Badge>
              <span className="text-xs text-muted">{l.difficulty}</span>
            </CardHeader>
            <CardTitle className="text-2xl">{l.title}</CardTitle>
            <CardDescription>{l.objective}</CardDescription>
            <div className="mt-6 flex items-center justify-between">
              <Button>
                <MonitorUp size={17} />
                Gatnaşykly sapak
              </Button>
              <Badge>4 bölüm</Badge>
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
function Assessments({ data, onNew }) {
  return (
    <motion.div key="assessments" {...pageMotion}>
      <Hero
        eyebrow="Bilimi barlamak"
        title={
          <>
            Soragdan
            <br />
            netijä çenli.
          </>
        }
        action={
          <Button variant="accent" size="lg" onClick={onNew}>
            Synag başlat
            <ArrowRight size={18} />
          </Button>
        }
      />
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {data.assessments.map((a) => {
          const s = data.subjects.find((x) => x.id === a.subject_id);
          return (
            <Card key={a.id} className="p-6">
              <CardHeader>
                <Badge style={{ color: s.color }}>{s.name}</Badge>
                <Badge>
                  <Clock3 size={13} />
                  {a.duration_minutes} min
                </Badge>
              </CardHeader>
              <CardTitle className="text-2xl">{a.title}</CardTitle>
              <CardDescription>
                {a.question_count} sorag · {a.max_points} bal · awtomatik we
                mugallym barlagy
              </CardDescription>
              <Progress value={100} className="mt-6" />
              <div className="mt-4 flex items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <Check size={14} className="text-teal" />
                  Merkezi wagt
                </span>
                <span className="flex items-center gap-1.5">
                  <Check size={14} className="text-teal" />
                  Awto-saklaýyş
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}
function SettingsPage() {
  return (
    <motion.div key="settings" {...pageMotion}>
      <Hero
        eyebrow="Ulgam"
        title={
          <>
            Maglumatlar
            <br />
            öz eliňde.
          </>
        }
      />
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {[
          [
            ShieldCheck,
            "Ýerli we goragly",
            "SanlyControl internet ulanmaýar. Maglumatlar bu kompýuterde saklanýar.",
          ],
          [
            Download,
            "Ätiýaçlyk nusga",
            "Sapaklary, soraglary we netijeleri bir faýla göçürip al.",
          ],
          [
            Activity,
            "Windows gurnamasyna taýýar",
            "Ulanyjy sahypasy ýerli hyzmatdan aýratyn gurlandyr. Şonuň üçin programma Windows gurnaýjysyna ygtybarly geçirilýär.",
          ],
          [
            Wifi,
            "Synp hyzmaty",
            "Şol bir Wi‑Fi torundaky telefonlar QR-kod bilen birigýär.",
          ],
        ].map(([I, t, d]) => (
          <Card key={t} className="p-6">
            <span className="mb-5 grid size-11 place-items-center rounded-xl bg-mist">
              <I size={20} />
            </span>
            <CardTitle>{t}</CardTitle>
            <CardDescription>{d}</CardDescription>
            {t === "Ätiýaçlyk nusga" && (
              <a href="/api/backup" className="mt-5 inline-flex">
                <Button>Göçürip al</Button>
              </a>
            )}
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
function Hero({ eyebrow, title, action }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr] xl:items-end">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="font-display text-[clamp(2.8rem,6vw,6rem)] font-black leading-[.9]">
          {title}
        </h2>
      </div>
      {action && <div className="xl:flex xl:justify-end">{action}</div>}
    </div>
  );
}

function NewSessionDialog({ open, setOpen, data, onCreated }) {
  const [subject, setSubject] = useState(data.subjects[0]?.id);
  const lessons = data.lessons.filter((x) => x.subject_id === subject),
    tests = data.assessments.filter((x) => x.subject_id === subject);
  async function submit(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const out = await api("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          subjectId: Number(d.subjectId),
          lessonId: Number(d.lessonId) || null,
          assessmentId: Number(d.assessmentId) || null,
          title: d.title,
        }),
      });
      setOpen(false);
      onCreated(out);
    } catch (err) {
      notify(err.message, "error");
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <Eyebrow>Täze sessiýa</Eyebrow>
        <DialogTitle>Sapagy başlat</DialogTitle>
        <DialogDescription>
          Dersi, sapagy we barlag işini saýla. Giriş kody awtomatik dörediler.
        </DialogDescription>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <Field label="Ders">
            <select
              className={inputClass}
              name="subjectId"
              value={subject}
              onChange={(e) => setSubject(Number(e.target.value))}
            >
              {data.subjects.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sessiýanyň ady">
            <input
              className={inputClass}
              name="title"
              defaultValue={`${data.subjects.find((x) => x.id === subject)?.name || "Sapak"} — janly sapak`}
              key={subject}
            />
          </Field>
          <Field label="Taýýar sapak">
            <select className={inputClass} name="lessonId">
              {lessons.map((l) => (
                <option value={l.id} key={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Synag toplumy">
            <select className={inputClass} name="assessmentId">
              {tests.map((t) => (
                <option value={t.id} key={t.id}>
                  {t.title} · {t.question_count} sorag
                </option>
              ))}
            </select>
          </Field>
          <Button variant="accent" size="lg">
            Sessiýany döret
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function JoinCard({ session, onOpen, onClose }) {
  return (
    <Dialog open={!!session} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <Eyebrow>Sessiýa taýýar</Eyebrow>
        <DialogTitle>Okuwçylary goş</DialogTitle>
        <DialogDescription>
          Telefonlary şol bir Wi‑Fi tora birikdiriň we QR-kody skanirläň.
        </DialogDescription>
        <div className="mt-6 grid items-center gap-6 sm:grid-cols-[210px_1fr]">
          <img
            className="w-full rounded-2xl border-[10px] border-white shadow-xl"
            src={session?.qr}
            alt="Sapaga goşulmak üçin QR-kod"
          />
          <div>
            <p className="font-display font-mono text-[clamp(2.2rem,7vw,4rem)] font-black tracking-[.14em]">
              {session?.code}
            </p>
            <p className="mt-3 break-all text-xs text-muted">
              {session?.joinUrl}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() =>
                navigator.clipboard
                  .writeText(session.joinUrl)
                  .then(() => notify("Salgy göçürildi."))
              }
            >
              Salgyny göçür
            </Button>
          </div>
        </div>
        <Button
          variant="accent"
          size="lg"
          className="mt-6 w-full"
          onClick={onOpen}
        >
          Dolandyryşa geç
          <ArrowRight size={18} />
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function TeacherApp({ user, onLogout }) {
  const [data, setData] = useState(null),
    [view, setView] = useState("overview"),
    [subject, setSubject] = useState(null),
    [newOpen, setNewOpen] = useState(false),
    [created, setCreated] = useState(null),
    [sessionId, setSessionId] = useState(null);
  async function load() {
    setData(await api("/api/bootstrap"));
  }
  useEffect(() => {
    load().catch((e) => notify(e.message, "error"));
  }, []);
  if (!data) return <Loading />;
  if (sessionId)
    return (
      <LiveSession
        id={sessionId}
        user={user}
        onLogout={onLogout}
        onBack={() => {
          setSessionId(null);
          load();
        }}
      />
    );
  let page =
    view === "overview" ? (
      <Dashboard
        data={data}
        onNew={() => setNewOpen(true)}
        onOpenSession={setSessionId}
        setView={setView}
        setSubject={setSubject}
      />
    ) : view === "lessons" ? (
      <Library
        data={data}
        selected={subject}
        setSelected={setSubject}
        onCreate={() => notify("Sapak konstruktory indiki iterasiýada açylar.")}
      />
    ) : view === "assessments" ? (
      <Assessments data={data} onNew={() => setNewOpen(true)} />
    ) : view === "results" ? (
      <motion.div key="results" {...pageMotion}>
        <Hero
          eyebrow="Seljeriş merkezi"
          title={
            <>
              Netije däl.
              <br />
              Indiki ädim.
            </>
          }
        />
        <SectionTitle eyebrow="Sessiýalar" title="Okuw ösüşi" />
        {data.sessions.length ? (
          <SessionList rows={data.sessions} onOpen={setSessionId} />
        ) : (
          <Empty>Seljermek üçin sessiýa ýok.</Empty>
        )}
      </motion.div>
    ) : (
      <SettingsPage />
    );
  return (
    <>
      <AppShell user={user} view={view} setView={setView} onLogout={onLogout}>
        {page}
      </AppShell>
      <NewSessionDialog
        open={newOpen}
        setOpen={setNewOpen}
        data={data}
        onCreated={(s) => {
          setCreated(s);
          setData((d) => ({ ...d, sessions: [s, ...d.sessions] }));
        }}
      />
      <JoinCard
        session={created}
        onClose={() => setCreated(null)}
        onOpen={() => {
          setSessionId(created.id);
          setCreated(null);
        }}
      />
    </>
  );
}

function useTeacherShare(sessionId, socketRef) {
  const [sharing, setSharing] = useState(false),
    streamRef = useRef(null),
    peersRef = useRef(new Map());
  async function start() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 10, min: 5 } },
        audio: false,
      });
      streamRef.current = stream;
      setSharing(true);
      const socket = socketRef.current,
        makePeer = async (target) => {
          if (peersRef.current.has(target)) return;
          const pc = new RTCPeerConnection();
          peersRef.current.set(target, pc);
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
          pc.onicecandidate = (e) =>
            e.candidate &&
            socket.emit("webrtc:ice", { target, candidate: e.candidate });
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("webrtc:offer", { target, sdp: pc.localDescription });
        };
      socket.on("students:online", (ids) => ids.forEach(makePeer));
      socket.on("student:online", ({ socketId }) => makePeer(socketId));
      socket.on("webrtc:answer", ({ from, sdp }) =>
        peersRef.current.get(from)?.setRemoteDescription(sdp),
      );
      socket.on(
        "webrtc:ice",
        ({ from, candidate }) =>
          candidate &&
          peersRef.current
            .get(from)
            ?.addIceCandidate(candidate)
            .catch(() => {}),
      );
      socket.emit("screen:request-online", { sessionId });
      stream.getVideoTracks()[0].onended = () => stop();
    } catch (e) {
      if (e.name !== "NotAllowedError")
        notify("Ekran paýlaşma açylmady.", "error");
    }
  }
  function stop() {
    streamRef.current?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    streamRef.current = null;
    peersRef.current.forEach((p) => p.close());
    peersRef.current.clear();
    socketRef.current?.emit("screen:stopped", { sessionId });
    setSharing(false);
  }
  useEffect(() => stop, [sessionId]);
  return [sharing, start];
}
function LiveSession({ id, user, onBack, onLogout }) {
  const [data, setData] = useState(null),
    [results, setResults] = useState(null),
    socketRef = useRef(null);
  const [sharing, startShare] = useTeacherShare(id, socketRef);
  async function load() {
    setData(await api(`/api/sessions/${id}/dashboard`));
  }
  useEffect(() => {
    load();
    const s = window.io?.();
    socketRef.current = s;
    s?.emit("classroom:join", { sessionId: id });
    s?.on("participants:changed", load);
    return () => s?.disconnect();
  }, [id]);
  if (!data) return <Loading />;
  const s = data.session;
  async function patch(body) {
    await api(`/api/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    await load();
  }
  async function showResults() {
    setResults(await api(`/api/sessions/${id}/results`));
  }
  return (
    <AppShell
      user={user}
      view=""
      setView={() => {}}
      onLogout={onLogout}
      title={s.title}
    >
      <motion.div key="live" {...pageMotion}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft size={17} />
            Baş sahypa
          </Button>
          <div className="flex gap-2">
            <Badge>
              Kod:{" "}
              <strong className="ml-1 font-mono tracking-[.12em]">
                {s.code}
              </strong>
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => patch({ allowJoin: !s.allow_join })}
            >
              {s.allow_join ? "Girişi ýap" : "Girişi aç"}
            </Button>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <section className="noise relative min-h-[540px] overflow-hidden rounded-3xl bg-ink p-7 text-white md:p-10">
            <span className="orb -right-28 -top-28 size-[380px]" />
            <div className="relative z-10 flex items-center justify-between">
              <Badge
                className="text-white"
                style={{ background: s.subject_color }}
              >
                {s.subject_name}
              </Badge>
              <LiveDot label={stateLabel(s.state)} dark />
            </div>
            <div className="relative z-10 mt-28 max-w-3xl">
              <Eyebrow className="text-lime">Janly sessiýa</Eyebrow>
              <h2 className="font-display text-[clamp(2.7rem,5vw,5.4rem)] font-black leading-[.9]">
                {s.title}
              </h2>
              <p className="mt-5 text-white/55">{s.lesson_title}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="accent" size="lg" onClick={startShare}>
                  <MonitorUp size={18} />
                  {sharing ? "Paýlaşmagy duruz" : "Ekrany görkez"}
                </Button>
                {s.state !== "assessment" ? (
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white/20 bg-transparent text-white hover:bg-white/10"
                    onClick={() =>
                      confirm("Synagy başlatmak isleýärsiňizmi?") &&
                      patch({ state: "assessment" })
                    }
                  >
                    Synagy başlat
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white/20 bg-transparent text-white hover:bg-white/10"
                    onClick={showResults}
                  >
                    Netijeleri aç
                  </Button>
                )}
              </div>
            </div>
          </section>
          <aside className="grid content-start gap-4">
            <Card>
              <CardHeader>
                <div>
                  <Eyebrow>Gatnaşyjylar</Eyebrow>
                  <CardTitle>{data.participants.length} okuwçy</CardTitle>
                </div>
                <LiveDot label="Janly" />
              </CardHeader>
              <div className="grid max-h-96 gap-2 overflow-auto">
                {data.participants.length ? (
                  data.participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl bg-mist p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-xl bg-ink text-xs font-bold text-lime">
                          {p.name[0]}
                        </span>
                        <div>
                          <strong className="block text-sm">{p.name}</strong>
                          <span className="text-[11px] text-muted">
                            {p.answered_count
                              ? `${p.answered_count} jogap saklandy`
                              : "Garaşýar"}
                          </span>
                        </div>
                      </div>
                      <Badge
                        tone={
                          p.submission_status === "submitted"
                            ? "good"
                            : "neutral"
                        }
                      >
                        {p.submission_status === "submitted"
                          ? "Tabşyrdy"
                          : "Işleýär"}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <Empty>Okuwçylaryň goşulmagyna garaşylýar.</Empty>
                )}
              </div>
            </Card>
            <Card className="bg-ink text-white">
              <Eyebrow className="text-lime">Çalt giriş</Eyebrow>
              <div className="font-mono text-3xl font-black tracking-[.16em]">
                {s.code}
              </div>
              <p className="mt-2 text-xs text-white/45">
                Okuwçylar brauzerde şu kody girizýärler.
              </p>
            </Card>
          </aside>
        </div>
        {results && <Results data={results} />}
      </motion.div>
    </AppShell>
  );
}
function Results({ data }) {
  return (
    <section className="mt-8">
      <SectionTitle
        eyebrow="Netijeler"
        title="Toparyň görkezijisi"
        action={
          <a href={`/api/sessions/${data.session.id}/export.csv`}>
            <Button variant="outline">
              <Download size={16} />
              CSV faýlyny al
            </Button>
          </a>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-auto p-0">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-mist text-left text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="p-4">Okuwçy</th>
                <th>Bal</th>
                <th>Göterim</th>
                <th>Ýagdaý</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="p-4 font-semibold">{r.name}</td>
                  <td>
                    {r.score}/{r.max_score}
                  </td>
                  <td>{r.percent}%</td>
                  <td>
                    <Badge tone={r.manual_pending ? "warn" : "good"}>
                      {r.manual_pending ? "Deslapky" : "Taýýar"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <Eyebrow>Gaýtadan düşündir</Eyebrow>
          <CardTitle>Köp ýalňyşylan soraglar</CardTitle>
          <div className="mt-5 grid gap-5">
            {data.mistakes.map((m, i) => (
              <div key={m.id}>
                <div className="mb-2 flex items-start justify-between gap-3 text-sm">
                  <strong>
                    {i + 1}. {m.prompt}
                  </strong>
                  <Badge tone="warn">{m.mistakes || 0}</Badge>
                </div>
                <Progress
                  value={m.attempts ? (m.mistakes / m.attempts) * 100 : 0}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

function StudentJoin({ code, onJoined, onCancel }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    code &&
      api(`/api/sessions/${code}/public`)
        .then(setInfo)
        .catch((e) => notify(e.message, "error"));
  }, [code]);
  async function submit(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(`/api/sessions/${code}/join`, {
        method: "POST",
        body: JSON.stringify(d),
      });
      onJoined();
    } catch (err) {
      notify(err.message, "error");
    }
  }
  if (!info) return <Loading />;
  return (
    <main className="min-h-screen bg-ink p-3 md:grid md:grid-cols-[1.08fr_.92fr]">
      <section className="noise relative flex min-h-[46vh] flex-col justify-between overflow-hidden rounded-[28px] p-7 text-white md:min-h-[calc(100vh-1.5rem)] md:p-[clamp(2rem,6vw,6rem)]">
        <Brand />
        <div>
          <Badge tone="dark">{info.subject_name}</Badge>
          <h1 className="font-display mt-5 text-[clamp(3rem,7vw,7rem)] font-black leading-[.88]">
            {info.title}
          </h1>
          <p className="mt-5 text-white/55">{info.lesson_title}</p>
        </div>
        <div className="flex gap-5 text-xs text-white/60">
          <span className="flex gap-2">
            <ShieldCheck size={15} className="text-lime" />
            Howpsuz giriş
          </span>
          <span className="flex gap-2">
            <Check size={15} className="text-lime" />
            Awto-saklaýyş
          </span>
        </div>
      </section>
      <section className="grid place-items-center p-6">
        <motion.div {...pageMotion} className="w-full max-w-md">
          <Eyebrow>Sapaga giriş</Eyebrow>
          <div className="font-mono text-5xl font-black tracking-[.16em]">
            {code}
          </div>
          <p className="mt-3 text-sm text-muted">
            Mugallym sizi bu sapaga çagyrdy.
          </p>
          {info.allow_join ? (
            <form className="mt-8 grid gap-4" onSubmit={submit}>
              <Field label="Adyň we familiýaň">
                <input
                  name="name"
                  className={inputClass}
                  autoComplete="name"
                  autoFocus
                />
              </Field>
              <Button variant="accent" size="lg">
                Sapaga goşul
                <ArrowRight size={18} />
              </Button>
            </form>
          ) : (
            <Card className="mt-8">
              <CardTitle>Giriş wagtlaýyn ýapyk</CardTitle>
              <CardDescription>
                Mugallymyň täzeden açmagyna garaşyň.
              </CardDescription>
            </Card>
          )}
          <Button variant="ghost" className="mt-3 w-full" onClick={onCancel}>
            Yza dolan
          </Button>
        </motion.div>
      </section>
    </main>
  );
}

function StudentClassroom() {
  const [data, setData] = useState(null),
    [index, setIndex] = useState(0),
    [answers, setAnswers] = useState({}),
    [remaining, setRemaining] = useState(null),
    [sharing, setSharing] = useState(false);
  const videoRef = useRef(null),
    peerRef = useRef(null),
    socketRef = useRef(null);
  async function load() {
    const next = await api("/api/student/current");
    setData(next);
    setAnswers((old) => ({
      ...Object.fromEntries(next.answers.map((a) => [a.question_id, a.answer])),
      ...old,
    }));
  }
  useEffect(() => {
    load().catch((e) => notify(e.message, "error"));
    const poll = setInterval(() => load().catch(() => {}), 3000);
    const socket = window.io?.();
    socketRef.current = socket;
    socket?.on("session:changed", load);
    socket?.on("webrtc:offer", async ({ from, sdp }) => {
      peerRef.current?.close();
      const pc = new RTCPeerConnection();
      peerRef.current = pc;
      pc.ontrack = (e) => {
        if (videoRef.current) {
          videoRef.current.srcObject = e.streams[0];
          setSharing(true);
        }
      };
      pc.onicecandidate = (e) =>
        e.candidate &&
        socket.emit("webrtc:ice", { target: from, candidate: e.candidate });
      await pc.setRemoteDescription(sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc:answer", { target: from, sdp: pc.localDescription });
    });
    socket?.on(
      "webrtc:ice",
      ({ candidate }) =>
        candidate &&
        peerRef.current?.addIceCandidate(candidate).catch(() => {}),
    );
    socket?.on("screen:stopped", () => {
      setSharing(false);
      peerRef.current?.close();
      peerRef.current = null;
    });
    return () => {
      clearInterval(poll);
      peerRef.current?.close();
      socket?.disconnect();
    };
  }, []);
  useEffect(() => {
    if (data?.session.id)
      socketRef.current?.emit("classroom:join", { sessionId: data.session.id });
  }, [data?.session.id]);
  useEffect(() => {
    if (!data?.session.ends_at) {
      setRemaining(null);
      return;
    }
    const tick = () =>
      setRemaining(
        Math.max(
          0,
          Math.floor(
            (new Date(data.session.ends_at).getTime() - Date.now()) / 1000,
          ),
        ),
      );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [data?.session.ends_at]);
  async function save(questionId, value) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
    const key = `sanly-answer-${data.session.id}-${questionId}`,
      payload = {
        questionId,
        answer: value,
        idempotencyKey: crypto.randomUUID(),
      };
    localStorage.setItem(key, JSON.stringify(payload));
    try {
      await api("/api/student/answers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      localStorage.removeItem(key);
    } catch (e) {
      notify(
        navigator.onLine
          ? e.message
          : "Jogap enjamda saklandy; tor gelende iberiler.",
        navigator.onLine ? "error" : "ok",
      );
    }
  }
  async function submit() {
    if (!confirm("Jogaplaryňy tabşyrmak isleýärmiň?")) return;
    try {
      const result = await api("/api/student/submit", {
        method: "POST",
        body: "{}",
      });
      notify(`Iş tabşyryldy · ${result.score}/${result.maxScore} bal`);
      await load();
    } catch (e) {
      notify(e.message, "error");
    }
  }
  if (!data) return <Loading />;
  const { student, session, lesson, questions, submission } = data,
    q = questions[index],
    answered = Object.keys(answers).filter(
      (k) => answers[k] !== "" && answers[k] != null,
    ).length;
  if (session.state !== "assessment" || submission?.status === "submitted")
    return (
      <main className="min-h-screen bg-mist p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-5 flex items-center justify-between">
            <Brand />
            <div className="flex items-center gap-3">
              <Badge tone="good">
                <Radio size={13} />
                Janly
              </Badge>
              <span className="text-sm font-bold">{student.name}</span>
            </div>
          </header>
          {sharing && (
            <Card className="mb-4 overflow-hidden bg-ink p-2">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="aspect-video w-full rounded-xl bg-black object-contain"
              />
            </Card>
          )}
          <motion.section
            {...pageMotion}
            className="noise relative min-h-[68vh] overflow-hidden rounded-3xl bg-ink p-7 text-white md:p-12"
          >
            <span className="orb -right-24 -top-24 size-80" />
            <div className="relative z-10">
              <Badge tone="dark">{session.subject_name}</Badge>
              <Eyebrow className="mt-16 text-lime">
                {submission?.status === "submitted"
                  ? "Iş tabşyryldy"
                  : "Janly sapak"}
              </Eyebrow>
              <h1 className="font-display max-w-4xl text-[clamp(3rem,7vw,7rem)] font-black leading-[.88]">
                {session.title}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/55">
                {lesson?.objective ||
                  "Mugallymyň görkezmesine garaşyň. Synag açylanda bu sahypa awtomatik täzelener."}
              </p>
            </div>
          </motion.section>
        </div>
      </main>
    );
  return (
    <main className="min-h-screen bg-mist">
      <header className="glass sticky top-0 z-20 border-b border-line">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
          <Brand />
          <div className="flex items-center gap-3">
            <Badge>
              {answered}/{questions.length} jogap
            </Badge>
            <Badge
              tone={remaining !== null && remaining < 120 ? "warn" : "neutral"}
            >
              <Clock3 size={13} />
              {remaining === null
                ? "—"
                : `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`}
            </Badge>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-4 p-4 pb-28 lg:grid-cols-[250px_1fr]">
        <aside className="h-fit rounded-2xl border border-line bg-white p-3 lg:sticky lg:top-24">
          <Eyebrow>Soraglar</Eyebrow>
          <div className="grid grid-cols-5 gap-2 lg:grid-cols-4">
            {questions.map((item, i) => (
              <button
                key={item.id}
                onClick={() => setIndex(i)}
                className={cn(
                  "grid aspect-square place-items-center rounded-xl text-xs font-black transition",
                  i === index
                    ? "bg-ink text-lime"
                    : answers[item.id] != null && answers[item.id] !== ""
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-mist text-muted",
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </aside>
        <motion.section key={q.id} {...pageMotion}>
          <Card className="min-h-[520px] p-6 md:p-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Eyebrow>
                  Sorag {index + 1} / {questions.length}
                </Eyebrow>
                <h1 className="font-display max-w-4xl text-2xl font-extrabold leading-tight md:text-4xl">
                  {q.prompt}
                </h1>
              </div>
              <Badge>{q.points} bal</Badge>
            </div>
            <div className="mt-10">
              {q.type === "choice" ? (
                <div className="grid gap-3">
                  {q.options.map((option, i) => (
                    <button
                      key={option}
                      onClick={() => save(q.id, option)}
                      className={cn(
                        "flex min-h-16 items-center gap-4 rounded-2xl border p-4 text-left text-sm font-semibold transition",
                        answers[q.id] === option
                          ? "border-teal bg-teal/5 ring-4 ring-teal/10"
                          : "border-line bg-white hover:border-teal/40",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-xl",
                          answers[q.id] === option
                            ? "bg-teal text-white"
                            : "bg-mist text-muted",
                        )}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  className={cn(inputClass, "min-h-44 resize-y p-4")}
                  value={answers[q.id] ?? ""}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                  }
                  onBlur={(e) =>
                    save(
                      q.id,
                      q.type === "numeric"
                        ? Number(e.target.value)
                        : e.target.value,
                    )
                  }
                  placeholder="Jogabyňy şu ýere ýaz…"
                />
              )}
            </div>
            <div className="mt-10 flex justify-between">
              <Button
                variant="outline"
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
              >
                <ArrowLeft size={16} />
                Öňki
              </Button>
              {index < questions.length - 1 ? (
                <Button onClick={() => setIndex((i) => i + 1)}>
                  Indiki
                  <ArrowRight size={16} />
                </Button>
              ) : (
                <Button variant="accent" onClick={submit}>
                  <Check size={17} />
                  Işi tabşyr
                </Button>
              )}
            </div>
          </Card>
        </motion.section>
      </div>
    </main>
  );
}
function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-mist">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="size-9 rounded-full border-4 border-line border-t-teal"
      />
    </div>
  );
}

function Root() {
  const [auth, setAuth] = useState(null),
    [loading, setLoading] = useState(true),
    [joinCode, setJoinCode] = useState(
      new URLSearchParams(location.search).get("join")?.toUpperCase() || null,
    );
  async function refresh() {
    const me = await api("/api/auth/me");
    setAuth(me);
    setLoading(false);
  }
  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);
  async function logout() {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    setAuth(null);
  }
  if (loading) return <Loading />;
  if (joinCode && !auth?.student)
    return (
      <StudentJoin
        code={joinCode}
        onJoined={refresh}
        onCancel={() => {
          history.replaceState({}, "", "/");
          setJoinCode(null);
        }}
      />
    );
  if (auth?.student) return <StudentClassroom />;
  if (auth?.user) return <TeacherApp user={auth.user} onLogout={logout} />;
  return (
    <Login
      onLogin={refresh}
      onStudent={() => {
        const code = prompt("6 belgili sapak koduny giriz:")
          ?.trim()
          .toUpperCase();
        if (code) {
          history.replaceState({}, "", `/?join=${code}`);
          setJoinCode(code);
        }
      }}
    />
  );
}

createRoot(document.getElementById("root")).render(
  <Tooltip.Provider delayDuration={250}>
    <Root />
    <Toasts />
  </Tooltip.Provider>,
);
