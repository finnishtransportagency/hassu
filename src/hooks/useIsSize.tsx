import { useMediaQuery } from "@mui/material";
import { Breakpoint, Breakpoints, useTheme } from "@mui/system";

const useIsSize = (breakpoint: Breakpoint, direction: keyof Pick<Breakpoints, "up" | "down">) => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints[direction](breakpoint));
};

export const useIsBelowBreakpoint = (breakpoint: Breakpoint) => useIsSize(breakpoint, "down");
export const useIsAboveBreakpoint = (breakpoint: Breakpoint) => useIsSize(breakpoint, "up");
