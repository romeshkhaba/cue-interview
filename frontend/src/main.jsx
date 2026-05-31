import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./data.js";
import AuthScreen from "./AuthScreen.jsx";
import InterviewHelper from "./InterviewHelper.jsx";
import {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakToggle,
  TweakSelect,
} from "./tweaks-panel.jsx";
import "./styles.css";

const FONT_MAP = {
  Sora: "'Sora', system-ui, sans-serif",
  "Space Grotesk": "'Space Grotesk', system-ui, sans-serif",
  "IBM Plex Sans": "'IBM Plex Sans', system-ui, sans-serif",
  "Bricolage Grotesque": "'Bricolage Grotesque', system-ui, sans-serif",
};

const TWEAK_DEFAULTS = {
  dark: true,
  font: "Sora",
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  // Auth bypassed — set a default session user so InterviewHelper loads directly
  const [user, setUser] = useState({ name: "User", email: "" });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", t.dark ? "dark" : "light");
  }, [t.dark]);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-ui", FONT_MAP[t.font] || FONT_MAP.Sora);
  }, [t.font]);

  return (
    <div className="app-shell">
      {user ? (
        <InterviewHelper
          user={user}
          dark={t.dark}
          onToggleTheme={() => setTweak("dark", !t.dark)}
          onSignOut={() => setUser(null)}
        />
      ) : (
        <AuthScreen onAuthed={(u) => setUser(u)} />
      )}

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakToggle label="Dark mode" value={t.dark} onChange={(v) => setTweak("dark", v)} />
        <TweakSection label="Typography" />
        <TweakSelect
          label="Interface font"
          value={t.font}
          options={["Sora", "Space Grotesk", "IBM Plex Sans", "Bricolage Grotesque"]}
          onChange={(v) => setTweak("font", v)}
        />
      </TweaksPanel>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
