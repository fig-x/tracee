interface StateDiffViewProps {
  input: unknown;
  output: unknown;
  changedKeys: string[];
}

function formatDiffValue(value: unknown): { text: string; empty: boolean } {
  if (value == null || value === "" || value === "null") return { text: "", empty: true };
  if (typeof value === "string") {
    if (value.trim().length === 0) return { text: "", empty: true };
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try { return { text: JSON.stringify(JSON.parse(trimmed), null, 2), empty: false }; } catch { /* fall through */ }
    }
    return { text: value, empty: false };
  }
  if (Array.isArray(value) && value.length === 0) return { text: "", empty: true };
  if (typeof value === "object" && Object.keys(value as object).length === 0) return { text: "", empty: true };
  return { text: JSON.stringify(value, null, 2), empty: false };
}

function truncateDiffValue(text: string, maxLen = 2000): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}\n… truncated (${text.length - maxLen} chars)`;
}

export function StateDiffView({ input, output, changedKeys }: StateDiffViewProps) {
  const prevState = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const nextState = (output && typeof output === "object" ? output : {}) as Record<string, unknown>;

  // Drop keys that produce no meaningful diff: either absent from both snapshots,
  // or present but rendering as empty on both sides (e.g. {} -> missing). The
  // upstream op metadata sometimes over-reports changedKeys; this hides the noise.
  const rows = changedKeys
    .map((key) => ({
      key,
      before: formatDiffValue(prevState[key]),
      after: formatDiffValue(nextState[key]),
      inPrev: Object.prototype.hasOwnProperty.call(prevState, key),
      inNext: Object.prototype.hasOwnProperty.call(nextState, key),
    }))
    .filter((r) => (r.inPrev || r.inNext) && !(r.before.empty && r.after.empty));

  if (rows.length === 0) return null;

  return (
    <div className="state-diff">
      {rows.map(({ key, before, after }) => {
        return (
          <div key={key} className="state-diff__entry">
            <div className="state-diff__key">{key}</div>
            <div className="state-diff__values">
              <div className="state-diff__row state-diff__row--before">
                <span className="state-diff__label">before</span>
                {before.empty
                  ? <span className="state-diff__empty">empty</span>
                  : <pre className="state-diff__pre">{truncateDiffValue(before.text)}</pre>
                }
              </div>
              <div className="state-diff__row state-diff__row--after">
                <span className="state-diff__label">after</span>
                {after.empty
                  ? <span className="state-diff__empty">empty</span>
                  : <pre className="state-diff__pre">{truncateDiffValue(after.text)}</pre>
                }
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
