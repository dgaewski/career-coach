import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { subscribeRefresh } from "../lib/live.js";

export interface DataState<T> { data: T | null; error: string | null; loading: boolean; reload(): void }

export function useData<T>(path: string): DataState<T> {
  const [state, setState] = useState<Omit<DataState<T>, "reload">>({ data: null, error: null, loading: true });
  const reload = useCallback(() => {
    api<T>(path).then(
      data => setState({ data, error: null, loading: false }),
      e => setState({ data: null, error: e instanceof Error ? e.message : String(e), loading: false }),
    );
  }, [path]);
  useEffect(() => {
    reload();
    return subscribeRefresh(reload);
  }, [reload]);
  return { ...state, reload };
}
