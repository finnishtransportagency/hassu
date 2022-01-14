import classNames from "classnames";
import React, { ReactElement, ReactNode } from "react";
import style from "@styles/form/FormGroup.module.css";

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
  className,
  flexDirection = "col",
  ...props
}: Props & React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>): ReactElement {
  return (
    <div className={classNames(style["form-group"], className)} {...props}>
      {label && <label>{label}</label>}
      <div className={classNames("flex", `flex-${flexDirection}`)}>{children}</div>
      {(bottomInfo || errorMessage) && (
        <div className="flex">
          {errorMessage && <span className="text-red">{errorMessage}</span>}
          {bottomInfo}
        </div>
      )}
    </div>
  );
}
