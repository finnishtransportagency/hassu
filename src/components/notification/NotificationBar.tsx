import { useTheme } from "@mui/material";
import React, { ReactElement } from "react";
import { getPublicEnv } from "src/util/env";

export interface HeaderProps {
  scrolledPastOffset: boolean;
}

export default function NotificationBar(): ReactElement | null {
  const theme = useTheme();
  if (getPublicEnv("ENVIRONMENT") !== "prod") return null;
  return (
    <div style={{ zIndex: theme.zIndex.appBar }} className="sticky bg-green transition-all">
      <div style={{ width: "100%", textAlign: "center" }} className="">
        <span>YMPÄRISTÖ: {getPublicEnv("ENVIRONMENT")} </span>
        <span>VERSIO: {getPublicEnv("VERSION")} </span>
      </div>
    </div>
  );
}
