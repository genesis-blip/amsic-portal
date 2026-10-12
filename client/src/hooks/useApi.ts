import { useCallback, useEffect, useRef, useState } from 'react';
import { parseApiError } from '../lib/http';

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const callId = useRef(0);

  const load = useCallback(async () => {
    const id = ++callId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (id === callId.current) setData(result);
    } catch (err) {
      if (id === callId.current) setError(parseApiError(err).message);
    } finally {
      if (id === callId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { void load(); }, [load]);

  return { data, loading, error, reload: load, setData };
}
