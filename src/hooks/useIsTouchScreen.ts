import { useEffect, useState } from "react";

export const useIsTouchScreen = () => {
  const [isTouchScr, setIsTouchScr] = useState(false);

  useEffect(
    () => {
      const handleResize = () =>
        setIsTouchScr("ontouchstart" in window || navigator.maxTouchPoints > 0 || (navigator as any).msMaxTouchPoints > 0);
      window.addEventListener("resize", handleResize);
      handleResize();
      return function cleanup() {
        window.removeEventListener("resize", handleResize);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [window.ontouchstart, navigator.maxTouchPoints, (navigator as any).msMaxTouchPoints]
  );

  return isTouchScr;
};
