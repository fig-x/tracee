import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { providerAPI } from "../../services/api";

const STATUS_POLL_MS = 15000;

function useOpenAIKeyStatus() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      providerAPI.getOpenAIStatus()
        .then((status) => { if (!cancelled) setConfigured(status.configured); })
        .catch(() => { if (!cancelled) setConfigured(null); });
    };

    check();
    const interval = window.setInterval(check, STATUS_POLL_MS);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return configured;
}

export function AppShell() {
  const keyConfigured = useOpenAIKeyStatus();
  const showKeyBanner = keyConfigured === false;

  return (
    <div className="app-shell">
      <nav className="app-shell__nav">
        <span className="app-shell__brand">tracee</span>
        <div className="app-shell__links">
          <NavLink
            className={({ isActive }) => `app-shell__link${isActive ? " is-active" : ""}`}
            end
            to="."
          >
            Docs
          </NavLink>
          <NavLink
            className={({ isActive }) => `app-shell__link${isActive ? " is-active" : ""}`}
            to="graph"
          >
            Graph
          </NavLink>
          <NavLink
            className={({ isActive }) => `app-shell__link${isActive ? " is-active" : ""}`}
            to="playground"
          >
            Playground
          </NavLink>
          <NavLink
            className={({ isActive }) => `app-shell__link${isActive ? " is-active" : ""}`}
            to="prompts"
          >
            Prompts
          </NavLink>
        </div>
        {showKeyBanner && (
          <div
            className="app-shell__banner"
            role="status"
            aria-live="polite"
            title="Playground runs and Cognition analysis require an OpenAI API key."
          >
            <span className="app-shell__banner-dot" aria-hidden />
            <span className="app-shell__banner-text">
              <code>OPENAI_API_KEY</code> not set —
              {" "}
              <NavLink to="docs" className="app-shell__banner-link">
                see setup
              </NavLink>
            </span>
          </div>
        )}
      </nav>
      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  );
}
