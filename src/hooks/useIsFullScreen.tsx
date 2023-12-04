import { useEffect, useState } from "react";

export function useIsFullScreen(element?: HTMLElement | null): boolean {
  const [isFullScreen, setIsFullScreen] = useState(false);
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullScreen(element ? document.fullscreenElement === element : Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [element]);

  return isFullScreen;
}
