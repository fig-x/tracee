import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import { fetchCognition, runCognitionAnalysis } from "../api/cognition";
import type { TraceCognition } from "../types/cognition";
import type { GraphNodeData, GraphEdgeData } from "../types/node-data";


interface UseCognitionOverlayResult {
  nodes: Node<GraphNodeData>[];
  edges: Edge<GraphEdgeData>[];
  cognition: TraceCognition | null;
  loading: boolean;
  error: string | null;
  analyzing: boolean;
  analyze: () => Promise<void>;
}

function getCognitionErrorMessage(error: unknown): string {
  if (
    typeof error === "object"
    && error !== null
    && "response" in error
    && typeof error.response === "object"
    && error.response !== null
    && "data" in error.response
    && typeof error.response.data === "object"
    && error.response.data !== null
    && "detail" in error.response.data
    && typeof error.response.data.detail === "string"
  ) {
    return error.response.data.detail;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "failed to load cognition";
}

export function useCognitionOverlay(
  traceId: string | null,
  graphId: string | null,
  baseNodes: Node<GraphNodeData>[],
  baseEdges: Edge<GraphEdgeData>[],
  active: boolean,
): UseCognitionOverlayResult {
  const [cognition, setCognition] = useState<TraceCognition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const activeTraceIdRef = useRef<string | null>(traceId);
  const activeGraphIdRef = useRef<string | null>(graphId);
  const analyzeRequestIdRef = useRef(0);

  useEffect(() => {
    activeTraceIdRef.current = traceId;
    activeGraphIdRef.current = graphId;
  }, [traceId, graphId]);

  // fetch cached cognition when layer becomes active
  useEffect(() => {
    if (!active || !traceId) {
      setCognition(null);
      setError(null);
      setAnalyzing(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const requestedTraceId = traceId;
    const requestedGraphId = graphId;
    setCognition(null);
    setError(null);
    setAnalyzing(false);
    setLoading(true);
    fetchCognition(requestedTraceId, requestedGraphId)
      .then((result) => {
        if (
          cancelled
          || activeTraceIdRef.current !== requestedTraceId
          || activeGraphIdRef.current !== requestedGraphId
        ) {
          return;
        }
        setCognition(result);
        setError(null);
      })
      .catch((err) => {
        if (
          cancelled
          || activeTraceIdRef.current !== requestedTraceId
          || activeGraphIdRef.current !== requestedGraphId
        ) {
          return;
        }
        setCognition(null);
        setError(getCognitionErrorMessage(err));
      })
      .finally(() => {
        if (
          cancelled
          || activeTraceIdRef.current !== requestedTraceId
          || activeGraphIdRef.current !== requestedGraphId
        ) {
          return;
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [traceId, graphId, active]);

  const analyze = useCallback(async () => {
    if (!traceId) return;
    const requestedTraceId = traceId;
    const requestedGraphId = graphId;
    const requestId = analyzeRequestIdRef.current + 1;
    analyzeRequestIdRef.current = requestId;
    setError(null);
    setAnalyzing(true);
    try {
      const result = await runCognitionAnalysis(requestedTraceId, requestedGraphId ?? undefined);
      if (
        activeTraceIdRef.current !== requestedTraceId
        || activeGraphIdRef.current !== requestedGraphId
        || analyzeRequestIdRef.current !== requestId
      ) {
        return;
      }
      setCognition(result);
      setError(null);
    } catch (err) {
      console.error("cognition analysis failed", err);
      if (analyzeRequestIdRef.current === requestId) {
        setError(getCognitionErrorMessage(err));
      }
    } finally {
      if (analyzeRequestIdRef.current === requestId) {
        setAnalyzing(false);
      }
    }
  }, [traceId, graphId]);

  // merge cognition data onto nodes
  const nodes = useMemo(() => {
    return baseNodes.map((n) => {
      if (!cognition || n.data.nodeType !== "agent") return n;
      const nodeCog = cognition.node_cognitions[n.id];
      if (!nodeCog) return n;
      return {
        ...n,
        data: { ...n.data, cognition: nodeCog },
      };
    });
  }, [baseNodes, cognition]);

  // edges pass through unchanged — no visual modifications in cognition layer
  const edges = baseEdges;

  return { nodes, edges, cognition, loading, error, analyzing, analyze };
}
