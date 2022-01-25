import { useContext } from "react";
import { SnackbarContext } from "@components/HassuSnackbarProvider";

const useSnackbars = () => useContext(SnackbarContext);

export default useSnackbars;
