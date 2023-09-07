import { useEffect } from "react";
import useSnackbars from "src/hooks/useSnackbars";
import { useIsBelowBreakpoint } from "./useIsSize";

export const useSetSnackbarFabAdjust = (offset = 115) => {
  const { setMobileBottomOffset } = useSnackbars();
  const isMobile = useIsBelowBreakpoint("sm");

  useEffect(() => {
    if (isMobile) {
      setMobileBottomOffset(offset);
    } else {
      setMobileBottomOffset(undefined);
    }
    return function cleanup() {
      setMobileBottomOffset(undefined);
    };
  }, [isMobile, offset, setMobileBottomOffset]);
};
