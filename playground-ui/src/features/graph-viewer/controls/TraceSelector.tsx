import { useEffect, useMemo, useRef, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import { deleteTrace, fetchTraceSummary, fetchTraces } from "../../../api/traces";
import { useLayer } from "../../../context/LayerContext";
import type { Layer } from "../../../context/LayerContext";
import type { GraphEdgeData, GraphNodeData, TraceOutlineItem, TraceOutlineItemKind } from "../../../types/node-data";
import type { TraceMetadata, TraceSummary } from "../../../types/trace";
import iconTraces from "../../../assets/icon-traces.svg";
import iconChain from "../../../assets/icon-chain.svg";
import cognitionIcon from "../../../assets/cognition.svg";
import iconCode from "../../../assets/icon-code.svg";
import iconCollapse from "../../../assets/icon-collapse.svg";
import iconError from "../../../assets/icon-error.svg";
import iconExpand from "../../../assets/icon-expand.svg";
import iconTrash from "../../../assets/icon-trash.svg";
import iconRetry from "../../../assets/icon-retry.svg";
import iconLlm from "../../../assets/icon-llm.svg";
import iconRag from "../../../assets/icon-rag.svg";
import iconState from "../../../assets/icon-state.svg";
import iconTool from "../../../assets/icon-tool.svg";
import { TraceMinimapPreview } from "./TraceMinimapPreview";

function isTraceLayer(layer: Layer): boolean {
  return layer === "execution" || layer === "cognition";
}

interface TraceSelectorProps {
  nodes: Node<GraphNodeData>[];
  edges: Edge<GraphEdgeData>[];
  graphId: string | null;
  outline: TraceOutlineItem[];
  outlineLoading: boolean;
  onOutlineSelect: (item: TraceOutlineItem) => void;
}

const OUTLINE_ICON_BY_KIND: Record<TraceOutlineItemKind, string> = {
  agent: cognitionIcon,
  llm_call: iconLlm,
  tool_call: iconTool,
  rag_retrieve: iconRag,
  code_exec: iconCode,
  subgraph_call: iconChain,
  state_update: iconState,
  error: iconError,
};

const OUTLINE_COLOR_BY_KIND: Record<TraceOutlineItemKind, string> = {
  agent: "chain",
  llm_call: "llm",
  tool_call: "tool",
  rag_retrieve: "rag",
  code_exec: "code",
  subgraph_call: "chain",
  state_update: "state",
  error: "error",
};

function formatDateTime(value?: string | null): string {
  if (!value) return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calculateLatency(created: string, updated: string): string {
  const c = new Date(created).getTime();
  const u = new Date(updated).getTime();
  if (Number.isNaN(c) || Number.isNaN(u)) return "n/a";
  const diff = u - c;
  if (diff < 1000) return `${diff}ms`;
  return `${(diff / 1000).toFixed(2)}s`;
}

function formatLatency(latencyMs?: number): string {
  if (typeof latencyMs !== "number") return "";
  if (latencyMs < 1000) return `${Math.round(latencyMs)}ms`;
  return `${(latencyMs / 1000).toFixed(1)}s`;
}

interface TraceOutlineTreeProps {
  items: TraceOutlineItem[];
  collapsedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (item: TraceOutlineItem) => void;
  depth?: number;
}

function TraceOutlineTree({
  items,
  collapsedIds,
  onToggle,
  onSelect,
  depth = 0,
}: TraceOutlineTreeProps) {
  return (
    <>
      {items.map((item) => {
        const isCollapsed = collapsedIds.has(item.id);
        const hasChildren = item.children.length > 0;
        const icon = OUTLINE_ICON_BY_KIND[item.kind];
        const colorClass = OUTLINE_COLOR_BY_KIND[item.kind];
        const isClickable = Boolean(item.nodeId);

        return (
          <div key={item.id} className="trace-outline__branch">
            <div
              className={`trace-outline__row trace-outline__row--${colorClass}${item.status === "error" ? " is-error" : ""}${isClickable ? " is-clickable" : ""}`}
              style={{ paddingLeft: `${12 + depth * 18}px` }}
            >
              <div className="trace-outline__row-main">
                {hasChildren ? (
                  <button
                    type="button"
                    className="trace-outline__toggle"
                    onClick={() => onToggle(item.id)}
                    aria-label={isCollapsed ? "expand branch" : "collapse branch"}
                  >
                    <img
                      src={isCollapsed ? iconExpand : iconCollapse}
                      alt=""
                      className="trace-outline__toggle-icon"
                      aria-hidden
                    />
                  </button>
                ) : (
                  <span className="trace-outline__toggle-spacer" />
                )}
                <button
                  type="button"
                  className="trace-outline__row-button"
                  onClick={() => onSelect(item)}
                  disabled={!isClickable}
                >
                  <span className={`trace-outline__icon-wrap trace-outline__icon-wrap--${colorClass}`}>
                    <img src={icon} alt="" className="trace-outline__icon" aria-hidden />
                  </span>
                  <span className="trace-outline__label">{item.label}</span>
                </button>
              </div>
              <span className="trace-outline__latency">{formatLatency(item.latencyMs)}</span>
            </div>
            {hasChildren && !isCollapsed && (
              <TraceOutlineTree
                items={item.children}
                collapsedIds={collapsedIds}
                onToggle={onToggle}
                onSelect={onSelect}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export function TraceSelector({
  nodes,
  edges,
  graphId,
  outline,
  outlineLoading,
  onOutlineSelect,
}: TraceSelectorProps) {
  const { layer, selectedTraceId, setSelectedTraceId } = useLayer();
  const [traces, setTraces] = useState<TraceMetadata[]>([]);
  const [summaries, setSummaries] = useState<Record<string, TraceSummary>>({});
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const [showTraceList, setShowTraceList] = useState(true);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const fetchedSummaryIdsRef = useRef<Set<string>>(new Set());
  const refreshTracesRef = useRef<(() => Promise<void>) | null>(null);
  const showsOperationOutline = isTraceLayer(layer);

  const allOutlineIds = useMemo(() => {
    const ids: string[] = [];
    const walk = (items: TraceOutlineItem[]) => {
      for (const item of items) {
        if (item.children.length > 0) {
          ids.push(item.id);
          walk(item.children);
        }
      }
    };
    walk(outline);
    return ids;
  }, [outline]);
  const allCollapsed = allOutlineIds.length > 0 && allOutlineIds.every((id) => collapsedIds.has(id));

  const selectedTrace = useMemo(
    () => traces.find((trace) => trace.trace_id === selectedTraceId) ?? null,
    [traces, selectedTraceId],
  );

  useEffect(() => {
    if (!isTraceLayer(layer)) {
      setTraces([]);
      refreshTracesRef.current = null;
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const mergeTraces = (incoming: TraceMetadata[], { replace = false }: { replace?: boolean } = {}) => {
      setTraces((current) => {
        const byId = new Map<string, TraceMetadata>();
        if (!replace) {
          for (const trace of current) byId.set(trace.trace_id, trace);
        }
        // incoming wins — picks up updated event_count / updated_at
        for (const trace of incoming) byId.set(trace.trace_id, trace);
        const merged = Array.from(byId.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        // skip state update if nothing changed — avoids re-triggering downstream effects
        if (merged.length === current.length) {
          let same = true;
          for (let i = 0; i < merged.length; i++) {
            const a = merged[i];
            const b = current[i];
            if (
              a.trace_id !== b.trace_id ||
              a.event_count !== b.event_count ||
              a.updated_at !== b.updated_at
            ) {
              same = false;
              break;
            }
          }
          if (same) return current;
        }
        return merged;
      });
    };

    const POLL_INTERVAL_MS = 3000;

    const poll = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) {
        timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }
      try {
        const items = await fetchTraces(100, 0, graphId);
        if (cancelled) return;
        mergeTraces(items);
      } catch {
        // swallow — next tick will retry
      }
      if (cancelled) return;
      timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
    };

    refreshTracesRef.current = async () => {
      try {
        const items = await fetchTraces(100, 0, graphId);
        if (cancelled) return;
        // replace on manual refresh so deletions on the server are reflected
        mergeTraces(items, { replace: true });
      } catch {
        // swallow — next poll will retry
      }
    };

    // kick off immediately, then poll on an interval
    poll();

    // resume immediately when the tab becomes visible again
    const handleVisibility = () => {
      if (cancelled) return;
      if (!document.hidden) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        poll();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [layer, graphId]);

  useEffect(() => {
    if (!isTraceLayer(layer) || traces.length === 0) {
      fetchedSummaryIdsRef.current = new Set();
      setSummaries((current) => (Object.keys(current).length === 0 ? current : {}));
      return;
    }

    // only fetch summaries for traces we haven't seen yet — avoids re-fetching
    // N summaries on every poll tick.
    const missing = traces.filter((trace) => !fetchedSummaryIdsRef.current.has(trace.trace_id));
    if (missing.length === 0) return;

    let cancelled = false;
    for (const trace of missing) {
      fetchedSummaryIdsRef.current.add(trace.trace_id);
      fetchTraceSummary(trace.trace_id)
        .then((summary) => {
          if (cancelled) return;
          setSummaries((current) => ({ ...current, [trace.trace_id]: summary }));
        })
        .catch(() => {
          fetchedSummaryIdsRef.current.delete(trace.trace_id);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [layer, traces]);

  useEffect(() => {
    if (!isTraceLayer(layer)) return;
    if (traces.length === 0) {
      if (selectedTraceId !== null) setSelectedTraceId(null);
      return;
    }
    if (!selectedTraceId || !traces.some((trace) => trace.trace_id === selectedTraceId)) {
      setSelectedTraceId(traces[0].trace_id);
    }
  }, [layer, traces, selectedTraceId, setSelectedTraceId]);

  useEffect(() => {
    if (!isTraceLayer(layer)) {
      setMaxHeight(null);
      return;
    }

    const element = cardRef.current;
    if (!element) return;

    const updateMaxHeight = () => {
      const { top } = element.getBoundingClientRect();
      const nextMaxHeight = Math.max(240, Math.floor(window.innerHeight - top - 16));
      setMaxHeight(nextMaxHeight);
    };

    updateMaxHeight();
    window.addEventListener("resize", updateMaxHeight);

    const observer = new ResizeObserver(() => {
      updateMaxHeight();
    });
    observer.observe(document.body);

    return () => {
      window.removeEventListener("resize", updateMaxHeight);
      observer.disconnect();
    };
  }, [layer, traces.length]);

  useEffect(() => {
    if (!showsOperationOutline) {
      setShowTraceList(true);
      return;
    }
    if (!selectedTraceId) {
      setShowTraceList(true);
      return;
    }
    setShowTraceList(false);
  }, [showsOperationOutline, selectedTraceId]);

  useEffect(() => {
    setCollapsedIds(new Set());
  }, [selectedTraceId, outline]);

  if (!isTraceLayer(layer)) return null;

  const handleTraceSelect = (traceId: string) => {
    setSelectedTraceId(traceId);
    if (showsOperationOutline) setShowTraceList(false);
  };

  const handleToggleBranch = (id: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCollapseAll = () => {
    setCollapsedIds(new Set(allOutlineIds));
  };

  const handleExpandAll = () => {
    setCollapsedIds(new Set());
  };

  const handleRefresh = async () => {
    if (refreshing || !refreshTracesRef.current) return;
    setRefreshing(true);
    try {
      await refreshTracesRef.current();
    } finally {
      setRefreshing(false);
    }
  };

  const handleConfirmDelete = async (traceId: string) => {
    if (deletingId) return;
    setDeletingId(traceId);
    try {
      await deleteTrace(traceId);
      setTraces((current) => current.filter((trace) => trace.trace_id !== traceId));
      setSummaries((current) => {
        if (!(traceId in current)) return current;
        const next = { ...current };
        delete next[traceId];
        return next;
      });
      fetchedSummaryIdsRef.current.delete(traceId);
      if (selectedTraceId === traceId) setSelectedTraceId(null);
    } catch {
      // swallow — user can retry; polling will reconcile
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  };

  return (
    <section
      ref={cardRef}
      className="trace-selector-card"
      style={maxHeight ? { maxHeight: `${maxHeight}px` } : undefined}
    >
      <header className="trace-selector-card__header">
        <div className="trace-selector-card__header-main">
          <h3 className="trace-selector-card__title">
            <img src={iconTraces} alt="" className="trace-selector-card__title-icon" aria-hidden />
            {showsOperationOutline && !showTraceList ? "Execution Outline" : "Execution Traces"}
          </h3>
          {showsOperationOutline && !showTraceList && selectedTrace && (
            <div className="trace-selector-card__subtitle">
              trace {selectedTrace.trace_id.slice(0, 8)}
            </div>
          )}
        </div>
        <div className="trace-selector-card__header-actions">
          {showsOperationOutline && !showTraceList ? (
            <>
              <button
                type="button"
                className="trace-selector-card__icon-btn"
                onClick={allCollapsed ? handleExpandAll : handleCollapseAll}
                disabled={allOutlineIds.length === 0}
                title={allCollapsed ? "expand all" : "collapse all"}
                aria-label={allCollapsed ? "expand all branches" : "collapse all branches"}
              >
                <img
                  src={allCollapsed ? iconExpand : iconCollapse}
                  alt=""
                  className="trace-selector-card__icon-btn-icon"
                  aria-hidden
                />
              </button>
              <button
                type="button"
                className="trace-selector-card__header-btn"
                onClick={() => setShowTraceList(true)}
              >
                back to traces
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`trace-selector-card__icon-btn${refreshing ? " is-spinning" : ""}`}
              onClick={handleRefresh}
              disabled={refreshing}
              title="refresh traces"
              aria-label="refresh trace list"
            >
              <img
                src={iconRetry}
                alt=""
                className="trace-selector-card__icon-btn-icon"
                aria-hidden
              />
            </button>
          )}
        </div>
      </header>
      {showsOperationOutline && !showTraceList ? (
        <div className="trace-outline">
          {outlineLoading ? (
            <div className="trace-selector-card__empty">loading execution...</div>
          ) : outline.length === 0 ? (
            <div className="trace-selector-card__empty">no operations found</div>
          ) : (
            <div className="trace-outline__list" onWheelCapture={(event) => event.stopPropagation()}>
              <div className="trace-outline__header-row">
                <span className="trace-outline__header-label">Operation</span>
                <span className="trace-outline__header-label">Latency</span>
              </div>
              <TraceOutlineTree
                items={outline}
                collapsedIds={collapsedIds}
                onToggle={handleToggleBranch}
                onSelect={onOutlineSelect}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="trace-selector-card__list" onWheelCapture={(event) => event.stopPropagation()}>
          {traces.length === 0 ? (
            <div className="trace-selector-card__empty">no traces found</div>
          ) : (
            traces.map((t) => {
              const isSelected = selectedTraceId === t.trace_id;
              const isPendingDelete = pendingDeleteId === t.trace_id;
              const isDeleting = deletingId === t.trace_id;
              return (
                <div
                  key={t.trace_id}
                  className={`trace-selector-item ${isSelected ? "is-selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleTraceSelect(t.trace_id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleTraceSelect(t.trace_id);
                    }
                  }}
                >
                  <div className="trace-selector-item__header">
                    <span className="trace-selector-item__id" title={t.trace_id}>
                      {t.trace_id.slice(0, 8)}
                    </span>
                    <div className="trace-selector-item__meta">
                      <span className="trace-selector-item__time">
                        {formatDateTime(t.created_at)}
                      </span>
                      <span className="trace-selector-item__latency">
                        {calculateLatency(t.created_at, t.updated_at)}
                      </span>
                      {isPendingDelete ? (
                        <span
                          className="trace-selector-item__confirm"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="trace-selector-item__confirm-btn trace-selector-item__confirm-btn--danger"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleConfirmDelete(t.trace_id);
                            }}
                            disabled={isDeleting}
                          >
                            {isDeleting ? "..." : "delete"}
                          </button>
                          <button
                            type="button"
                            className="trace-selector-item__confirm-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              setPendingDeleteId(null);
                            }}
                            disabled={isDeleting}
                          >
                            cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="trace-selector-item__delete-btn"
                          title="delete trace"
                          aria-label={`delete trace ${t.trace_id.slice(0, 8)}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setPendingDeleteId(t.trace_id);
                          }}
                        >
                          <img
                            src={iconTrash}
                            alt=""
                            className="trace-selector-item__delete-icon"
                            aria-hidden
                          />
                        </button>
                      )}
                    </div>
                  </div>
                  <TraceMinimapPreview nodes={nodes} edges={edges} summary={summaries[t.trace_id]} />
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}


