export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function handle<T>(res: { ok: boolean; status: number; json(): Promise<unknown> }): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  let msg = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    msg = body.message ?? body.error ?? msg;   // fastify shape carries the detail in `message`
  } catch { /* non-JSON error body */ }
  throw new ApiError(res.status, msg);
}

export async function api<T>(path: string): Promise<T> {
  return handle<T>(await fetch(path));
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  return handle<T>(await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}
