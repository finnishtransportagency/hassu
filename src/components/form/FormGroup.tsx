import classNames from "classnames";
import React, { ReactElement, ReactNode } from "react";
import { styled, experimental_sx as sx } from "@mui/material";

interface Props {
  label?: string;
  children: ReactNode;
  errorMessage?: string | undefined;
  maxLength?: number;
  length?: number;
  bottomInfo?: ReactNode;
  flexDirection?: "row" | "col";
}

export default function FormGroup({
  label,
  children,
  errorMessage,
  bottomInfo,
  flexDirection = "col",
  ...props
}: Props & React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>): ReactElement {
  return (
    <div {...props}>
      {label && <Label>{label}</Label>}
      <div className={classNames("flex", flexDirection === "row" ? "flex-row" : "flex-col")}>{children}</div>
      {(bottomInfo || errorMessage) && (
        <div className="flex">
          {errorMessage && <span className="text-red">{errorMessage}</span>}
          {bottomInfo}
        </div>
      )}
    </div>
  );
}

const Label = styled("label")(() =>
  sx({
    display: "block",
    marginBottom: 2,
  })
);
