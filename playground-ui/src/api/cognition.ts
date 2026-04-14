import client from "./client";
import type { TraceCognition } from "../types/cognition";

function isMissingCognitionResponse(error: unknown): boolean {
  if (
    typeof error === "object"
    && error !== null
    && "response" in error
    && typeof error.response === "object"
    && error.response !== null
    && "status" in error.response
    && error.response.status === 404
    && "data" in error.response
    && typeof error.response.data === "object"
    && error.response.data !== null
    && "detail" in error.response.data
    && typeof error.response.data.detail === "string"
  ) {
    return error.response.data.detail.includes("No cognition results");
  }

  return false;
}

export async function fetchCognition(
  traceId: string,
  graphId?: string | null,
): Promise<TraceCognition | null> {
  const params = graphId ? { graph_id: graphId } : {};
  const { data } = await client.get<TraceCognition>(`/traces/${traceId}/cognition`, { params }).catch((err) => {
    if (isMissingCognitionResponse(err)) return { data: null };
    throw err;
  });
  return data;
}

export async function runCognitionAnalysis(
  traceId: string,
  graphId?: string,
): Promise<TraceCognition> {
  const params = graphId ? { graph_id: graphId } : {};
  const { data } = await client.post<TraceCognition>(`/traces/${traceId}/analyze`, null, { params });
  return data;
}
