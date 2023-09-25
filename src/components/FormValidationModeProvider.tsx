import React, { createContext, MutableRefObject, ReactNode, useRef } from "react";

export enum ValidationMode {
  DRAFT = "DRAFT",
  PUBLISH = "PUBLISH",
}

export type ValidationModeState = MutableRefObject<ValidationMode> | undefined;

export const ValidationModeContext = createContext<ValidationModeState>(undefined);

interface Props {
  children?: ReactNode;
}

function FormValidationModeProvider({ children }: Props) {
  const value = useRef<ValidationMode>(ValidationMode.DRAFT);
  return <ValidationModeContext.Provider value={value}>{children}</ValidationModeContext.Provider>;
}

export { FormValidationModeProvider };
