import classNames from "classnames";
import React, { ReactElement, ReactNode } from "react";
import { styled, experimental_sx as sx, capitalize } from "@mui/material";
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
  controlName?: string;
}

export default function FormGroup({
  label,
  children,
  errorMessage,
  bottomInfo,
  flexDirection = "col",
  inlineFlex,
  controlName,
  ...props
}: Props & React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>): ReactElement {
  return (
    <div {...props}>
      {label && <Label htmlFor={controlName}>{capitalize(label)}</Label>}
      <div className={classNames(inlineFlex ? "inline-flex" : "flex", flexDirection === "row" ? "flex-row" : "flex-col")}>{children}</div>
      {(bottomInfo || errorMessage) && (
        <div className="flex">
          {errorMessage && (
            <>
              <HassuStack direction={"row"} columnGap={"0.25rem"} alignItems={"baseline"}>
                <ErrorSpan sx={{ fontSize: "14px" }}>
                  <ErrorOutlineIcon fontSize="inherit" />
                </ErrorSpan>
                <ErrorSpan>{errorMessage}</ErrorSpan>
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

export const ErrorSpan = styled("span")({
  color: "#F10E0E",
  fontSize: "12px",
});
