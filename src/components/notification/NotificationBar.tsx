import { useTheme } from "@mui/material";
import React, { ReactElement } from "react";
import { getPublicEnv } from "src/util/env";

export interface HeaderProps {
  scrolledPastOffset: boolean;
}

export default function NotificationBar(): ReactElement {
  const theme = useTheme();
  return (
    <div style={{ zIndex: theme.zIndex.appBar }} className="sticky bg-green transition-all">
      <div style={{ width: "100%", textAlign: "center" }} className="">
        <span>YMPÄRISTÖ: {getPublicEnv("ENVIRONMENT_2")} </span>
        <span>VERSIO: {getPublicEnv("VERSION_2")} </span>
      </div>
    </div>
  );
}
