import { post } from "./api.js";

export function setAppStatus(id: string, status: string): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>(`/api/jobs/${id}/app-status`, { status });
}

export function toggleTodo(index: number, done: boolean): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>("/api/todos/toggle", { index, done });
}
