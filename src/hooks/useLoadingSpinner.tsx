import { LoadingSpinnerContext } from "@components/layout/LoadingSpinnerProvider";
import { useContext } from "react";

const useLoadingSpinner = () => useContext(LoadingSpinnerContext);

export default useLoadingSpinner;
