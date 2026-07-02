// Contains code generated or recommended by Amazon Q
import React, { ReactElement, createContext, ReactNode, useCallback, useMemo, useState } from "react";
import { Backdrop, CircularProgress } from "@mui/material";

interface Props {
  children?: ReactNode;
}

type LoadingSpinnerState = {
  withLoadingSpinner: <T>(promise: Promise<T>) => Promise<T>;
  isLoading: boolean;
};

export const LoadingSpinnerContext = createContext<LoadingSpinnerState>({
  withLoadingSpinner: async (promise) => promise,
  isLoading: false,
});

export default function LoadingSpinnerProvider({ children }: Props) {
  const [promises, setPromises] = useState<number>(0);

  const withLoadingSpinner: LoadingSpinnerState["withLoadingSpinner"] = useCallback(async (newPromise) => {
    const decrementPromises = () => setPromises((initial) => (initial > 0 ? initial - 1 : 0));
    const incrementPromises = () => setPromises((initial) => initial + 1);

    newPromise.finally(decrementPromises);
    incrementPromises();
    return newPromise;
  }, []);

  const loadingContext: LoadingSpinnerState = useMemo(
    () => ({
      withLoadingSpinner,
      isLoading: promises > 0,
    }),
    [promises, withLoadingSpinner]
  );

  return (
    <LoadingSpinnerContext.Provider value={loadingContext}>
      {children}
      <HassuSpinner open={loadingContext.isLoading} />
    </LoadingSpinnerContext.Provider>
  );
}

interface SpinnerProps {
  open: boolean;
}

// Workaround for MUI issue https://github.com/mui/material-ui/issues/32286
// MUI Backdrop uses react-transition-group Fade transition which can get stuck
// in "exiting" state during page navigation, leaving an invisible element
// (opacity: 0, pointer-events: auto) that blocks all user interaction.
// Conditional rendering ensures Backdrop is removed from DOM immediately
// when not needed, eliminating the stuck transition issue entirely.
const HassuSpinner = (props: SpinnerProps): ReactElement => {
  if (!props.open) {
    return <></>;
  }
  return (
    <Backdrop sx={{ color: "#49C2F1", zIndex: (theme) => theme.zIndex.modal + 1 }} open>
      <CircularProgress color="inherit" />
    </Backdrop>
  );
};
