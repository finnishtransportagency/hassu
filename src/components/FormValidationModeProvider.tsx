import { ValidationMode, ValidationModeState } from "hassu-common/ProjektiValidationContext";
import React, { createContext, ReactNode, useRef } from "react";

export const ValidationModeContext = createContext<ValidationModeState>(undefined);

interface Props {
  children?: ReactNode;
}

function FormValidationModeProvider({ children }: Props) {
  const value = useRef<ValidationMode>(ValidationMode.DRAFT);
  return <ValidationModeContext.Provider value={value}>{children}</ValidationModeContext.Provider>;
}

export { FormValidationModeProvider };
