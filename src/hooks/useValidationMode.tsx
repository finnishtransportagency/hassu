import { ValidationModeContext } from "@components/FormValidationModeProvider";
import { useContext } from "react";

const useValidationMode = () => useContext(ValidationModeContext);

export default useValidationMode;
