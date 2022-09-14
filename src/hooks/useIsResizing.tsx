import { useRef, useState, useEffect } from "react";
import { debounce, throttle } from "lodash";

export default function useIsResizing() {
  const [isResizing, setIsResizing] = useState(false);

  const debouncedResizeFalse = useRef(
    debounce(() => {
      setIsResizing(false);
    }, 500)
  ).current;

  const throttledResizeHandler = useRef(
    throttle(() => {
      setIsResizing(true);
      debouncedResizeFalse();
    }, 100)
  ).current;

  useEffect(() => {
    window.addEventListener("resize", throttledResizeHandler);
    return () => {
      window.removeEventListener("resize", throttledResizeHandler);
      debouncedResizeFalse.cancel();
      throttledResizeHandler.cancel();
    };
  }, [isResizing, debouncedResizeFalse, throttledResizeHandler]);

  return isResizing;
}
