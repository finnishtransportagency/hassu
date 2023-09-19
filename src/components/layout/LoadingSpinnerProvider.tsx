import HassuSpinner from "@components/HassuSpinner";
import React, { createContext, ReactNode, useMemo, useState } from "react";

interface Props {
  children?: ReactNode;
}

type LoadingSpinnerState = {
  withLoadingSpinner: (promise: Promise<unknown>) => void;
  isLoading: boolean;
};

export const LoadingSpinnerContext = createContext<LoadingSpinnerState>({
  withLoadingSpinner: () => undefined,
  isLoading: false,
});

export default function LoadingSpinnerProvider({ children }: Props) {
  const [promises, setPromises] = useState<number>(0);

  const loadingContext: LoadingSpinnerState = useMemo(
    () => ({
      withLoadingSpinner: (newPromise) => {
        const decrementPromises = () => setPromises((initial) => (initial - 1 >= 0 ? initial - 1 : 0));
        const IncrementPromises = () => setPromises((initial) => initial + 1);

        newPromise.finally(decrementPromises);
        IncrementPromises();
      },
      isLoading: promises > 0,
    }),
    [promises]
  );

  return (
    <LoadingSpinnerContext.Provider value={loadingContext}>
      {children}
      <HassuSpinner open={loadingContext.isLoading} />
    </LoadingSpinnerContext.Provider>
  );
}
