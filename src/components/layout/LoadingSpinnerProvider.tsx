import React, { ReactElement, createContext, ReactNode, useCallback, useMemo, useState } from "react";
import { Backdrop, CircularProgress } from "@mui/material";

interface Props {
  children?: ReactNode;
}

type LoadingSpinnerState<T extends unknown> = {
  withLoadingSpinner: (promise: Promise<T>) => Promise<T>;
  isLoading: boolean;
};

export const LoadingSpinnerContext = createContext<LoadingSpinnerState<unknown>>({
  withLoadingSpinner: async (promise) => promise,
  isLoading: false,
});

export default function LoadingSpinnerProvider<T extends unknown>({ children }: Props) {
  const [promises, setPromises] = useState<number>(0);

  const withLoadingSpinner: LoadingSpinnerState<T>["withLoadingSpinner"] = useCallback(async (newPromise) => {
    const decrementPromises = () => setPromises((initial) => (initial > 0 ? initial - 1 : 0));
    const incrementPromises = () => setPromises((initial) => initial + 1);

    newPromise.finally(decrementPromises);
    incrementPromises();
    return newPromise;
  }, []);

  const loadingContext: LoadingSpinnerState<T> = useMemo(
    () => ({
      withLoadingSpinner,
      isLoading: promises > 0,
    }),
    [promises, withLoadingSpinner]
  );

  return (
    <LoadingSpinnerContext.Provider value={loadingContext as LoadingSpinnerState<unknown>}>
      {children}
      <HassuSpinner open={loadingContext.isLoading} />
    </LoadingSpinnerContext.Provider>
  );
}

interface Props {
  open: boolean;
}

const HassuSpinner = (props: Props): ReactElement => {
  return (
    <Backdrop sx={{ color: "#49C2F1", zIndex: (theme) => theme.zIndex.modal + 1 }} open={props.open}>
      <CircularProgress color="inherit" />
    </Backdrop>
  );
};
