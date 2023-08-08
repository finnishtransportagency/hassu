import { useRef, useState, useEffect } from "react";
import throttle from "lodash/throttle";
import debounce from "lodash/debounce";

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
