import { useTheme } from "@mui/material";
import React, { ReactElement } from "react";

export interface HeaderProps {
  scrolledPastOffset: boolean;
}

export default function NotificationBar(): ReactElement {
  const theme = useTheme();
  return (
    <div style={{ zIndex: theme.zIndex.appBar }} className="sticky bg-green transition-all">
      <div style={{ width: "100%", textAlign: "center" }} className="">
        <span>YMPÄRISTÖ: {process.env.ENVIRONMENT} </span>
        <span>VERSIO: {process.env.VERSION} </span>
      </div>
    </div>
  );
}
