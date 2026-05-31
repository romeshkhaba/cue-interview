/* Cue — Authentication screens (sign in / sign up / forgot password) */
import React, { useState } from "react";

/* --- inline icons --- */
export function CueMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--accent-soft)" stroke="var(--accent-line)" />
      <circle cx="16" cy="16" r="4" fill="var(--accent)" />
      <path d="M22.5 9.5a9 9 0 0 1 0 13M25.5 6.5a13 13 0 0 1 0 19" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <path d="M9.5 9.5a9 9 0 0 0 0 13" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
  );
}
function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
  );
}
function Eye({ off }) {
  return off ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A18.5 18.5 0 0 0 2 12s3 8 10 8a9.12 9.12 0 0 0 5.39-1.61M1 1l22 22"/><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/></svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z"/><circle cx="12" cy="12" r="3"/></svg>
  );
}
function ArrowRight() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
}

function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s; // 0..4
}

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("signin"); // signin | signup | forgot
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", remember: true });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: null }));
  };

  function validate() {
    const e = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = "Enter a valid email address.";
    if (mode !== "forgot") {
      if (form.password.length < 8) e.password = "Password must be at least 8 characters.";
    }
    if (mode === "signup") {
      if (!form.name.trim()) e.name = "Tell us your name.";
      if (form.confirm !== form.password) e.confirm = "Passwords don't match.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (mode === "forgot") { setSent(true); return; }
      onAuthed({ name: form.name || form.email.split("@")[0], email: form.email });
    }, 850);
  }

  function social(provider) {
    setBusy(true);
    setTimeout(() => onAuthed({ name: provider === "Google" ? "Alex Rivera" : "octocat", email: provider === "Google" ? "alex@gmail.com" : "octo@github.com" }), 800);
  }

  const title = mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password";
  const desc =
    mode === "signin" ? "Sign in to start your interview session." :
    mode === "signup" ? "Two minutes to set up your live copilot." :
    "We'll email you a secure link to set a new password.";

  const ss = strength(form.password);

  return (
    <div className="auth">
      <aside className="auth-aside">
        <div className="aside-top">
          <div className="brand"><span className="brand-mark"><CueMark /></span><span className="brand-name">Cue</span></div>
        </div>
        <div className="aside-mid">
          <span className="aside-eyebrow">● Live interview copilot</span>
          <h2 className="aside-headline">Never get caught <em>off-guard</em> in an interview again.</h2>
          <p className="aside-sub">Cue listens to the question, drafts a sharp answer with talking points, and writes the code — all in real time, right beside your call.</p>
          <ul className="aside-points">
            <li><span className="tick"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>Real-time answers as the question is asked</li>
            <li><span className="tick"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>One tap for production-ready code</li>
            <li><span className="tick"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>Stays private and out of the way</li>
          </ul>
        </div>
        <div className="aside-bottom"><span>© 2026 Cue</span><span>·</span><span>Practice mode demo</span></div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="brand"><span className="brand-mark"><CueMark /></span><span className="brand-name">Cue</span></div>

          {sent ? (
            <div>
              <h1 className="auth-title">Check your inbox</h1>
              <p className="auth-desc">If an account exists for <b style={{color:"var(--text)"}}>{form.email}</b>, a reset link is on its way. It expires in 30 minutes.</p>
              <button className="btn btn-primary btn-block btn-lg" onClick={() => { setSent(false); setMode("signin"); }}>Back to sign in</button>
            </div>
          ) : (
            <>
              <h1 className="auth-title">{title}</h1>
              <p className="auth-desc">{desc}</p>

              {mode !== "forgot" && (
                <>
                  <div className="social-row">
                    <button className="social-btn" onClick={() => social("Google")} disabled={busy}><GoogleIcon /> Google</button>
                    <button className="social-btn" onClick={() => social("GitHub")} disabled={busy}><GithubIcon /> GitHub</button>
                  </div>
                  <div className="divider-or">or</div>
                </>
              )}

              <form className="auth-form" onSubmit={submit} noValidate>
                {mode === "signup" && (
                  <div className="field">
                    <label>Full name</label>
                    <input className={"input" + (errors.name ? " err" : "")} placeholder="Alex Rivera" value={form.name} onChange={set("name")} />
                    {errors.name && <span className="field-err">{errors.name}</span>}
                  </div>
                )}

                <div className="field">
                  <label>Email</label>
                  <input className={"input" + (errors.email ? " err" : "")} type="email" placeholder="you@company.com" value={form.email} onChange={set("email")} />
                  {errors.email && <span className="field-err">{errors.email}</span>}
                </div>

                {mode !== "forgot" && (
                  <div className="field">
                    <div className="auth-row-split">
                      <label>Password</label>
                      {mode === "signin" && <button type="button" className="link" onClick={() => setMode("forgot")}>Forgot?</button>}
                    </div>
                    <div className="pwd-wrap">
                      <input className={"input" + (errors.password ? " err" : "")} type={show ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={set("password")} style={{ paddingRight: 44 }} />
                      <button type="button" className="pwd-toggle" onClick={() => setShow((s) => !s)} aria-label="Toggle password"><Eye off={show} /></button>
                    </div>
                    {mode === "signup" && form.password && (
                      <div className="pwd-meter">{[0,1,2,3].map((i) => <i key={i} className={i < ss ? "on" : ""} />)}</div>
                    )}
                    {errors.password && <span className="field-err">{errors.password}</span>}
                  </div>
                )}

                {mode === "signup" && (
                  <div className="field">
                    <label>Confirm password</label>
                    <input className={"input" + (errors.confirm ? " err" : "")} type={show ? "text" : "password"} placeholder="••••••••" value={form.confirm} onChange={set("confirm")} />
                    {errors.confirm && <span className="field-err">{errors.confirm}</span>}
                  </div>
                )}

                {mode === "signin" && (
                  <label className="checkbox"><input type="checkbox" checked={form.remember} onChange={set("remember")} /> Keep me signed in</label>
                )}

                <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={busy}>
                  {busy ? "Just a sec…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
                  {!busy && <ArrowRight />}
                </button>
              </form>

              <div className="auth-foot">
                {mode === "signin" && <>New to Cue? <button className="link" onClick={() => setMode("signup")}>Create an account</button></>}
                {mode === "signup" && <>Already have an account? <button className="link" onClick={() => setMode("signin")}>Sign in</button></>}
                {mode === "forgot" && <>Remembered it? <button className="link" onClick={() => setMode("signin")}>Back to sign in</button></>}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
