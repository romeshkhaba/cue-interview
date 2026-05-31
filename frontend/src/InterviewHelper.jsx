/* Cue — Interview Helper (record → transcribe → stream answer → code) */
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";

const ROLE_GROUPS = [
  {
    group: "Frontend",
    roles: [
      { label: "React Developer",       lang: "JS",  langColor: "#f0db4f", langText: "#1a1a1a" },
      { label: "Vue.js Developer",       lang: "JS",  langColor: "#f0db4f", langText: "#1a1a1a" },
      { label: "Angular Developer",      lang: "TS",  langColor: "#3178c6", langText: "#fff" },
      { label: "TypeScript Developer",   lang: "TS",  langColor: "#3178c6", langText: "#fff" },
    ],
  },
  {
    group: "Backend",
    roles: [
      { label: "Golang Backend Engineer",  lang: "Go",  langColor: "#00acd7", langText: "#fff" },
      { label: "Python Backend Engineer",  lang: "PY",  langColor: "#3572a5", langText: "#fff" },
      { label: "Java Backend Engineer",    lang: "Java",langColor: "#ea2d2e", langText: "#fff" },
      { label: "Node.js Developer",        lang: "JS",  langColor: "#f0db4f", langText: "#1a1a1a" },
      { label: "Ruby on Rails Developer",  lang: "RB",  langColor: "#cc342d", langText: "#fff" },
      { label: "C++ Engineer",             lang: "C++", langColor: "#6295cb", langText: "#fff" },
      { label: "Rust Engineer",            lang: "RS",  langColor: "#ce412b", langText: "#fff" },
    ],
  },
  {
    group: "Full Stack",
    roles: [
      { label: "Full Stack Developer",     lang: "JS",  langColor: "#f0db4f", langText: "#1a1a1a" },
      { label: "Software Architect",       lang: "—",   langColor: "#555e6b", langText: "#fff" },
    ],
  },
  {
    group: "Mobile",
    roles: [
      { label: "iOS Developer",            lang: "Swift",  langColor: "#f05138", langText: "#fff" },
      { label: "Android Developer",        lang: "Kotlin", langColor: "#7f52ff", langText: "#fff" },
    ],
  },
  {
    group: "DevOps / Cloud",
    roles: [
      { label: "DevOps Engineer",           lang: "YAML", langColor: "#555e6b", langText: "#fff" },
      { label: "Site Reliability Engineer", lang: "Go",   langColor: "#00acd7", langText: "#fff" },
      { label: "Cloud Engineer",            lang: "TF",   langColor: "#7b42bc", langText: "#fff" },
    ],
  },
  {
    group: "Data / ML",
    roles: [
      { label: "Data Scientist",            lang: "PY", langColor: "#3572a5", langText: "#fff" },
      { label: "Machine Learning Engineer", lang: "PY", langColor: "#3572a5", langText: "#fff" },
      { label: "Data Engineer",             lang: "PY", langColor: "#3572a5", langText: "#fff" },
    ],
  },
  {
    group: "Security / QA",
    roles: [
      { label: "Security Engineer",         lang: "PY", langColor: "#3572a5", langText: "#fff" },
      { label: "QA / Automation Engineer",  lang: "PY", langColor: "#3572a5", langText: "#fff" },
    ],
  },
];

function highlight(text, query) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="role-combo-mark">{text.slice(idx, idx + query.trim().length)}</mark>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

function RoleCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const q = query.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!q) return ROLE_GROUPS;
    const matching = ROLE_GROUPS.map((g) => ({
      ...g,
      roles: g.roles.filter((r) => r.label.toLowerCase().includes(q)),
    })).filter((g) => g.roles.length > 0);
    return matching;
  }, [q]);

  const flatFiltered = useMemo(() => filteredGroups.flatMap((g) => g.roles), [filteredGroups]);

  useEffect(() => { setActiveIdx(-1); }, [q]);

  useEffect(() => {
    function onOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(".role-combo-item.kb-active");
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  function select(label) {
    setQuery(label);
    onChange(label);
    setOpen(false);
    setActiveIdx(-1);
  }

  function clear(e) {
    e.stopPropagation();
    setQuery("");
    onChange("");
    inputRef.current?.focus();
  }

  function handleKey(e) {
    if (!open) { if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true); return; }
    if (e.key === "Escape") { setOpen(false); setActiveIdx(-1); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, flatFiltered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); select(flatFiltered[activeIdx].label); }
  }

  let flatIdx = 0;

  return (
    <div className="role-combo-wrap" ref={wrapRef}>
      <div className={"role-combo-box" + (open ? " open" : "")}>
        <span className="role-combo-search-ic">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </span>
        <input
          ref={inputRef}
          className="role-combo-input"
          type="text"
          placeholder="Search or type your role…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          maxLength={120}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button type="button" className="role-combo-clear" onMouseDown={clear} tabIndex={-1} aria-label="Clear">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        )}
        <button type="button" className={"role-combo-chevron" + (open ? " flipped" : "")} tabIndex={-1} onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o); }} aria-label="Toggle">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
      </div>

      {open && (
        <div className="role-combo-dropdown" ref={listRef}>
          {filteredGroups.length === 0 ? (
            <div className="role-combo-empty">No matches — your input will be used as-is</div>
          ) : (
            filteredGroups.map((g) => (
              <div key={g.group} className="role-combo-group">
                <div className="role-combo-group-label">{g.group}</div>
                {g.roles.map((r) => {
                  const idx = flatIdx++;
                  const isActive = idx === activeIdx;
                  return (
                    <div
                      key={r.label}
                      className={"role-combo-item" + (isActive ? " kb-active" : "") + (r.label === query ? " selected" : "")}
                      onMouseDown={(e) => { e.preventDefault(); select(r.label); }}
                      onMouseEnter={() => setActiveIdx(idx)}
                    >
                      <span className="role-combo-item-label">{highlight(r.label, query)}</span>
                      <span className="role-combo-lang-badge" style={{ background: r.langColor, color: r.langText }}>{r.lang}</span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
import { CueMark } from "./AuthScreen.jsx";

const BASE = import.meta.env.VITE_API_BASE || "";
const API_URL = `${BASE}/api/answer`;
const INTRO_URL = `${BASE}/api/intro`;

/* icons */
function MicIcon({ size = 24 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" /></svg>;
}
function SendIcon() {return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>;}
function CodeIcon() {return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6" /></svg>;}
function RefreshIcon() {return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" /></svg>;}
function CopyIcon() {return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;}
function PlusIcon() {return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;}
function SunIcon() {return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;}
function MoonIcon() {return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;}
function SparkIcon() {return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.6 5.8L19 9.4l-5.4 1.6L12 17l-1.6-6L5 9.4l5.4-1.6z" /></svg>;}
function UploadIcon({ size = 20 }) {return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>;}
function FileIcon() {return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>;}
function XIcon() {return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>;}
function UserIcon({ size = 18 }) {return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;}

function bytesFmt(n) {
  if (n == null) return "";
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(0) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

function fmt(s) {const m = Math.floor(s / 60),ss = s % 60;return `${m}:${ss.toString().padStart(2, "0")}`;}

/* animated bars */
function Waveform({ live }) {
  const bars = 26;
  return (
    <div className={"wave" + (live ? "" : " idle")}>
      {Array.from({ length: bars }).map((_, i) =>
      <i key={i} style={live ? {
        animationDuration: `${0.5 + i * 37 % 60 / 100}s`,
        animationDelay: `${i * 53 % 80 / 100}s`,
        height: `${30 + i * 71 % 60}%`
      } : null} />
      )}
    </div>);

}

function getSupportedMimeType() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export default function InterviewHelper({ user, dark, onToggleTheme, onSignOut }) {
  const [status, setStatus] = useState("idle"); // idle | session
  const [recording, setRecording] = useState(false);
  const [phase, setPhase] = useState(null); // transcribe | thinking | short | points | complete
  const [scn, setScn] = useState(null);
  const [qText, setQText] = useState("");
  const [shortText, setShortText] = useState("");
  const [points, setPoints] = useState([]);
  const [code, setCode] = useState({ open: false, text: "", done: false });
  const [elapsed, setElapsed] = useState(0);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const [resume, setResume] = useState(null); // { name, size, parsed }
  const [introLoading, setIntroLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [role, setRole] = useState("");
  const [history, setHistory] = useState([]); // [{question, answer}] last 5 exchanges
  const [approach, setApproach] = useState([]); // step-by-step lines below code

  const cyc = useRef(0);
  const cancels = useRef([]);
  const recTimer = useRef(null);
  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const clearAll = useCallback(() => {
    cancels.current.forEach((c) => c());
    cancels.current = [];
  }, []);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => () => {
    clearAll();
    clearInterval(recTimer.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    stopTracks();
  }, [clearAll, audioUrl]);

  function typewriter(text, onUpdate, { speed = 14, chunk = 1, onDone } = {}) {
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(text.length, i + chunk);
      onUpdate(text.slice(0, i));
      if (i >= text.length) {clearInterval(id);onDone && onDone();}
    }, speed);
    return () => clearInterval(id);
  }
  const pushT = (ms, fn) => {const id = setTimeout(fn, ms);cancels.current.push(() => clearTimeout(id));};

  function flashToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  /* ----- recording ----- */
  async function startRecording() {
    clearAll();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stopTracks();
      };

      recorder.start();
      setRecording(true);
      setElapsed(0);
      clearInterval(recTimer.current);
      recTimer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (e) {
      flashToast(e?.message || "Could not access the microphone");
      stopTracks();
    }
  }
  function recordingBlob() {
    return new Blob(chunksRef.current, { type: recorderRef.current?.mimeType || "audio/webm" });
  }

  function stopRecording() {
    setRecording(false);
    clearInterval(recTimer.current);

    const recorder = recorderRef.current;
    if (!recorder) return Promise.resolve(null);
    if (recorder.state !== "recording") return Promise.resolve(recordingBlob());

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = recordingBlob();
        if (blob.size > 0) {
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          setAudioUrl(URL.createObjectURL(blob));
        }
        stopTracks();
        resolve(blob);
      };
      recorder.stop();
    });
  }
  async function sendRecording() {
    const blob = await stopRecording();
    if (!blob || blob.size < 512) {
      flashToast("No audio captured — try again");
      return;
    }

    clearAll();
    setStatus("session");
    setPhase("thinking");
    setQText("Transcribing your question…");
    setShortText(""); setPoints([]); setApproach([]);
    setCode({ open: false, text: "", done: false });
    setScn(null);

    try {
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const formData = new FormData();
      formData.append("audio", blob, `interview-question.${ext}`);
      if (role.trim()) formData.append("role", role.trim());
      if (history.length) formData.append("history", JSON.stringify(history));

      const res = await fetch(API_URL, { method: "POST", body: formData });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        flashToast(body.error || `Request failed (${res.status})`);
        setStatus("idle"); setPhase(null);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      // accumulate scn data as events arrive
      let live = { q: "", short: "", points: [], code: "", lang: "javascript", file: "answer" };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // SSE lines are separated by \n\n; parse each complete event
        const parts = buf.split("\n\n");
        buf = parts.pop(); // keep the incomplete trailing chunk

        for (const part of parts) {
          const dataLine = part.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          let event;
          try { event = JSON.parse(dataLine.slice(6)); } catch { continue; }

          switch (event.type) {
            case "question":
              live = { ...live, q: event.text };
              setScn({ ...live });
              setQText(event.text);
              setPhase("thinking");
              break;

            case "short_delta":
              setPhase("short");
              live = { ...live, short: (live.short || "") + event.text };
              setShortText((prev) => prev + event.text);
              break;

            case "short_done":
              setScn({ ...live });
              break;

            case "point":
              live = { ...live, points: [...live.points, event.text] };
              setScn({ ...live });
              setPhase("points");
              setPoints((p) => [...p, event.text]);
              break;

            case "code":
              live = { ...live, code: event.text, lang: event.lang || "javascript", file: event.file || "answer" };
              setScn({ ...live });
              // auto-open and typewriter the code — no button click needed
              setCode({ open: true, text: "", done: false });
              cancels.current.push(
                typewriter(event.text, (t) => setCode((c) => ({ ...c, text: t })), {
                  speed: 8, chunk: 3, onDone: () => setCode((c) => ({ ...c, done: true })),
                })
              );
              break;

            case "approach":
              setApproach((prev) => [...prev, event.text]);
              break;

            case "done":
              setPhase("complete");
              if (live.q && live.short) {
                setHistory((prev) => {
                  const entry = { question: live.q, answer: live.short };
                  const next = [...prev, entry];
                  return next.length > 5 ? next.slice(-5) : next;
                });
              }
              break;

            case "error":
              flashToast(event.message || "Answer generation failed");
              setStatus("idle"); setPhase(null);
              break;
          }
        }
      }
    } catch (e) {
      flashToast(e?.message || "Network error — is the backend running?");
      setStatus("idle"); setPhase(null);
    }
  }

  /* ----- session pipeline ----- */
  function beginSession(s) {
    clearAll();
    setStatus("session");
    setScn(s);
    setQText("");setShortText("");setPoints([]);setApproach([]);
    setCode({ open: false, text: "", done: false });
    setPhase("transcribe");

    cancels.current.push(typewriter(s.q, setQText, { speed: 16, chunk: 2, onDone: () => {
        setPhase("thinking");
        pushT(950, () => {
          setPhase("short");
          cancels.current.push(typewriter(s.short, setShortText, { speed: 11, chunk: 2, onDone: () => {
              setPhase("points");
              revealPoints(s.points, 0);
            } }));
        });
      } }));
  }

  function revealPoints(list, i) {
    if (i >= list.length) {setPhase("complete");return;}
    setPoints((p) => [...p, list[i]]);
    pushT(430, () => revealPoints(list, i + 1));
  }

  const [codeLoading, setCodeLoading] = useState(false);

  function showCode() {
    if (!scn || code.open) return;
    setCode({ open: true, text: "", done: false });
    cancels.current.push(typewriter(scn.code, (t) => setCode((c) => ({ ...c, text: t })), {
      speed: 8, chunk: 3, onDone: () => setCode((c) => ({ ...c, done: true }))
    }));
  }

  async function fetchCode() {
    if (!scn || code.open || codeLoading) return;
    setCodeLoading(true);
    setCode({ open: true, text: "", done: false });

    try {
      const res = await fetch(`${BASE}/api/code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: scn.q, role: role.trim() }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        flashToast(body.error || "Code generation failed");
        setCode({ open: false, text: "", done: false });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let accCode = "";
      let lang = "javascript";
      let file = "answer";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const part of parts) {
          const dataLine = part.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          let event;
          try { event = JSON.parse(dataLine.slice(6)); } catch { continue; }

          if (event.type === "meta") {
            lang = event.lang || "javascript";
            file = event.file || "answer";
            setScn((prev) => ({ ...prev, lang, file }));
          } else if (event.type === "delta") {
            accCode += event.text;
            setCode((c) => ({ ...c, text: accCode }));
          } else if (event.type === "done") {
            setScn((prev) => ({ ...prev, code: accCode, lang, file }));
            setCode((c) => ({ ...c, done: true }));
          } else if (event.type === "error") {
            flashToast(event.message || "Code generation failed");
            setCode({ open: false, text: "", done: false });
          }
        }
      }
    } catch (e) {
      flashToast(e?.message || "Network error");
      setCode({ open: false, text: "", done: false });
    } finally {
      setCodeLoading(false);
    }
  }

  function copyCode() {
    if (!scn) return;
    try {navigator.clipboard.writeText(scn.code);} catch (e) {}
    flashToast("Code copied to clipboard");
  }

  function newQuestion() {
    clearAll();stopRecording();
    setStatus("idle");setScn(null);setPhase(null);
    setQText("");setShortText("");setPoints([]);setApproach([]);setCode({ open: false, text: "", done: false });
  }

  /* ----- résumé ----- */
  function handleFiles(fileList) {
    const f = fileList && fileList[0];
    if (!f) return;
    const meta = { name: f.name, size: f.size, parsed: null };
    const isText = /\.(txt|md|markdown|csv|rtf)$/i.test(f.name) || /^text\//.test(f.type);
    if (isText) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        setResume({ ...meta, text, parsed: window.cueParseResume(text) });
      };
      reader.onerror = () => setResume(meta);
      reader.readAsText(f);
    } else {
      setResume(meta); // binary (pdf/docx) — can't parse client-side; intro falls back to your profile
    }
    flashToast("Résumé added");
  }

  async function generateIntro() {
    if (!resume || introLoading) return;

    clearAll();
    setIntroLoading(true);
    setStatus("session");
    setScn({
      q: "Tell me about yourself.",
      qLabel: "Opening prompt",
      badge: "Your introduction",
      intro: true,
      short: "",
      points: [],
    });
    setQText("Tell me about yourself.");
    setShortText("");
    setPoints([]);
    setCode({ open: false, text: "", done: false });
    setPhase("short");

    try {
      const res = await fetch(INTRO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: user.name,
          resumeName: resume.name,
          resumeText: resume.text || "",
          parsed: resume.parsed || {},
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setShortText(fullText);
      }

      fullText += decoder.decode();
      setShortText(fullText.trim());
      setPhase("complete");
    } catch (e) {
      flashToast(e?.message || "Could not generate introduction");
      setStatus("idle");
      setPhase(null);
    } finally {
      setIntroLoading(false);
    }
  }

  const streaming = phase === "transcribe" || phase === "thinking" || phase === "short" || phase === "points";

  /* dock states */
  const dockTitle = recording ? "Listening…" : status === "idle" ? "Capture a question" : "Ask another question";
  const dockHint = recording ? "Tap send when the interviewer finishes" : status === "idle" ? "Tap the mic to begin" : "Tap the mic to capture the next one";

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand"><span className="brand-mark"><CueMark /></span><span className="brand-name">Cue</span></div>
          <span className="session-pill"><span className={"live-dot" + (recording ? " on" : "")} />{recording ? "Recording" : "Session ready"}</span>
        </div>
        <div className="topbar-right">
          <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme">{dark ? <SunIcon /> : <MoonIcon />}</button>
          <div className="avatar-wrap">
            <button className="avatar" onClick={() => setMenu((m) => !m)}>{(user.name || "U").trim().charAt(0).toUpperCase()}</button>
            {menu &&
            <>
                <div style={{ position: "fixed", inset: 0, zIndex: 35 }} onClick={() => setMenu(false)} />
                <div className="menu">
                  <div className="menu-head"><div className="nm">{user.name}</div><div className="em">{user.email}</div></div>
                  <button className="menu-item" onClick={() => {setMenu(false);flashToast("Practice settings — demo only");}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> Practice settings</button>
                  <button className="menu-item danger" onClick={onSignOut}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg> Sign out</button>
                </div>
              </>
            }
          </div>
        </div>
      </header>

      <div className="stage">
        {status === "idle" ?
        <div className="idle">
            <span className="brand-mark" style={{ width: 56, height: 56 }}><CueMark size={56} /></span>
            <h1>Ready when you are.</h1>
            <p>Tap the mic below when your interviewer asks a question. Cue will transcribe it, draft your answer, and write the code on request.</p>

            <div className="role-input-wrap">
              <label className="role-label">Role you&apos;re interviewing for</label>
              <RoleCombobox value={role} onChange={setRole} />
            </div>

            {resume ?
            <div className="resume-card">
                <span className="resume-ic"><FileIcon /></span>
                <div className="resume-info">
                  <span className="resume-name">{resume.name}</span>
                  <span className="resume-meta">
                    {bytesFmt(resume.size)}
                    {resume.parsed && (resume.parsed.role || (resume.parsed.skills && resume.parsed.skills.length)) ?
                    " · " + [resume.parsed.role, resume.parsed.skills && resume.parsed.skills.length ? resume.parsed.skills.slice(0, 3).join(", ") : null].filter(Boolean).join(" · ") :
                    " · ready"}
                  </span>
                </div>
                <button className="resume-x" onClick={() => setResume(null)} title="Remove résumé"><XIcon /></button>
              </div> :

            <div
              className={"resume-zone" + (dragOver ? " over" : "")}
              onClick={() => fileRef.current && fileRef.current.click()}
              onDragOver={(e) => {e.preventDefault();setDragOver(true);}}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {e.preventDefault();setDragOver(false);handleFiles(e.dataTransfer.files);}}>
                <span className="resume-zone-ic"><UploadIcon /></span>
                <div className="resume-zone-txt">
                  <strong>Add your résumé <span className="opt">optional</span></strong>
                  <span>Drop a PDF or text file, or click to browse — then generate your intro.</span>
                </div>
              </div>
            }
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.md,.rtf,.csv" onChange={(e) => handleFiles(e.target.files)} style={{ display: "none" }} />

            {resume &&
            <button className="btn btn-primary btn-lg generate-intro" onClick={generateIntro} disabled={introLoading}>
                <SparkIcon /> {introLoading ? "Generating…" : "Generate my introduction"}
              </button>
            }

            <div className="idle-or">Or try an example question</div>
            <div className="suggest">
              {[{ l: "Reverse a linked list", i: 0 }, { l: "Process vs. thread", i: 1 }, { l: "How a hash map works", i: 2 }, { l: "Design a URL shortener", i: 4 }].map((c) =>
            <button key={c.i} className="chip" onClick={() => beginSession(window.CUE_SCENARIOS[c.i])}>{c.l}</button>
            )}
            </div>
          </div> :

        <div className="qa">
            <div className="card q-card">
              <span className="q-icon">{scn && scn.intro ? <UserIcon size={18} /> : <MicIcon size={18} />}</span>
              <div style={{ flex: 1 }}>
                <div className="q-label">{scn && scn.qLabel || "Question heard"}</div>
                <div className="q-text">{qText}{phase === "transcribe" && <span className="cursor" />}</div>
              </div>
            </div>

            {phase === "thinking" ?
          <div className="card a-card">
                <div className="a-head"><span className="spark"><SparkIcon /></span><span className="badge">Cue</span></div>
                <span className="thinking">Thinking<i /><i /><i /></span>
              </div> :
          phase !== "transcribe" &&
          <div className="card a-card">
                <div className="a-head"><span className="spark"><SparkIcon /></span><span className="badge">{scn && scn.badge || "Suggested answer"}</span></div>
                <p className="a-short">{shortText}{phase === "short" && <span className="cursor" />}</p>

                {points.length > 0 && (phase === "points" || phase === "complete") &&
            <>
                    <div className="a-sub">Key points to hit</div>
                    <ul className="points">
                      {points.map((p, i) =>
                <li key={i}><span className="dot" />{p}</li>
                )}
                    </ul>
                  </>
            }

                {phase === "complete" &&
            <div className="a-actions">
                    {!code.open && (
                      scn && scn.code
                        ? <button className="btn btn-primary" onClick={showCode}><CodeIcon /> Show me the code</button>
                        : <button className="btn btn-primary" onClick={fetchCode} disabled={codeLoading}>
                            <CodeIcon /> {codeLoading ? "Generating…" : "Example code"}
                          </button>
                    )}
                    <button className="btn btn-subtle" onClick={() => beginSession(scn)}><RefreshIcon /> Regenerate</button>
                    <button className="btn btn-ghost" onClick={newQuestion}><PlusIcon /> New question</button>
                  </div>
            }
              </div>
          }

            {code.open &&
          <div className="card code-card">
                <div className="code-head">
                  <div className="code-file">
                    <span className="code-dots"><i /><i /><i /></span>
                    {scn.file}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="lang-tag">{scn.lang}</span>
                    <button className="copy-btn" onClick={copyCode}><CopyIcon /> Copy</button>
                  </div>
                </div>
                <div className="code-body">
                  <div className="gutter">{code.text.split("\n").map((_, i) => <span key={i}>{i + 1}</span>)}</div>
                  <pre className="code-pre" dangerouslySetInnerHTML={{ __html: window.cueHighlight(code.text, scn.lang) + (code.done ? "" : '<span class="cursor"></span>') }} />
                </div>
              </div>
          }
          </div>
        }
      </div>

      {/* record dock — compact, bottom-right */}
      <div className="dock">
        <div className={"dock-inner" + (recording ? " live" : "")}>
          {recording ?
          <>
              <button className="rec-btn live" onClick={sendRecording} title="Stop & send"><span className="rec-square" /></button>
              <Waveform live />
              <div className="dock-meta">
                <span className="dock-title">Listening…</span>
                <span className="timer">{fmt(elapsed)}</span>
              </div>
              <button className="btn btn-primary dock-send" onClick={sendRecording}><SendIcon /> Send</button>
            </> :

          <button className="rec-btn" onClick={startRecording} title={status === "idle" ? "Record a question" : "Record another question"}>
              <MicIcon />
            </button>
          }
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>);

}
