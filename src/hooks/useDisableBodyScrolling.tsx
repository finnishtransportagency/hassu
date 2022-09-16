import { useEffect } from "react";

export const useDisableBodyScroll = (disableScroll: boolean) => {
  useEffect(() => {
    if (disableScroll) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [disableScroll]);
};
