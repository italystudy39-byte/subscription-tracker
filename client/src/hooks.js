import { useCallback, useEffect, useState, createContext, useContext } from 'react';

export function useApi(fn, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then(
      (data) => alive && setState({ loading: false, error: null, data }),
      (error) => alive && setState({ loading: false, error, data: null }),
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { ...state, reload };
}

export const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export const SettingsContext = createContext({ settings: null, reload: () => {} });
export const useSettings = () => useContext(SettingsContext);
