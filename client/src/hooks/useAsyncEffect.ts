import { useEffect } from 'react';
import { isAbortError } from '@/utils/isAbortError';

export function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<void>,
  deps: React.DependencyList,
): void {
  useEffect(() => {
    const controller = new AbortController();

    void effect(controller.signal).catch((error) => {
      if (!isAbortError(error) && !controller.signal.aborted) {
        console.error(error);
      }
    });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
