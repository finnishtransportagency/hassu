import React, { ReactElement, ReactNode } from "react";

interface Props {
  label?: string;
  children: ReactNode;
  errorMessage?: string | undefined;
  maxLength?: number;
  length?: number;
  bottomInfo?: ReactNode;
}

export default function FormGroup({ label, children, errorMessage, bottomInfo }: Props): ReactElement {
  return (
    <>
      {label && <label>{label}</label>}
      {children}

      {(bottomInfo || errorMessage) && (
        <div className="flex">
          {errorMessage && <span className="text-secondary-red">{errorMessage}</span>}
          {bottomInfo}
        </div>
      )}
    </>
  );
}
