import classNames from "classnames";
import React, { ReactElement, ReactNode } from "react";
import { styled, experimental_sx as sx } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HassuStack from "@components/layout/HassuStack";

interface Props {
  label?: string;
  children: ReactNode;
  errorMessage?: string | undefined;
  maxLength?: number;
  length?: number;
  bottomInfo?: ReactNode;
  flexDirection?: "row" | "col";
  inlineFlex?: boolean;
}

export default function FormGroup({
  label,
  children,
  errorMessage,
  bottomInfo,
  flexDirection = "col",
  inlineFlex,
  ...props
}: Props & React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>): ReactElement {
  return (
    <div {...props}>
      {label && <Label>{label}</Label>}
      <div className={classNames(inlineFlex ? "inline-flex" : "flex", flexDirection === "row" ? "flex-row" : "flex-col")}>{children}</div>
      {(bottomInfo || errorMessage) && (
        <div className="flex">
          {errorMessage && (
            <>
              <HassuStack direction={"row"} columnGap={"0.25rem"} alignItems={"baseline"}>
                <span className="text-red" style={{ fontSize: "14px" }}>
                  <ErrorOutlineIcon fontSize="inherit" />
                </span>
                <span className="text-red" style={{ fontSize: "12px" }}>
                  {errorMessage}
                </span>
              </HassuStack>
            </>
          )}
          {bottomInfo}
        </div>
      )}
    </div>
  );
}

export const Label = styled("label")(
  sx({
    display: "block",
    marginBottom: 1,
  })
);
