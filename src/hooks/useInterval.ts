import { DependencyList, useEffect, useRef } from "react";

export function useInterval(callback: () => Promise<boolean>, delay: number, maxRetries: number, deps: DependencyList) {
  const savedCallback = useRef<() => Promise<boolean>>();
  const retriesLeft = useRef<number>(maxRetries);
  const intervalId = useRef<ReturnType<typeof setTimeout>>();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function stopPolling() {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
    }

    function tick() {
      if (savedCallback.current) {
        // Jos callback palauttaa false, lopetetaan yrittäminen
        savedCallback.current().then((result) => {
          if (!result || retriesLeft.current <= 0) {
            stopPolling();
          } else {
            retriesLeft.current = retriesLeft.current - 1;
          }
        });
      }
    }

    if (delay !== null) {
      intervalId.current = setInterval(tick, delay);
      return () => stopPolling();
    } else {
      stopPolling();
    }
  }, [delay, maxRetries, ...deps]);
}
