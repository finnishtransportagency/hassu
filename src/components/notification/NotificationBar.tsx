import { useTheme } from "@mui/material";
import React, { ReactElement } from "react";
import { getEnvironment } from "src/util/getEnvironment";

export interface HeaderProps {
  scrolledPastOffset: boolean;
}

export default function NotificationBar(): ReactElement {
  const theme = useTheme();
  const env = getEnvironment(process.env.NEXT_PUBLIC_ENVIRONMENT ?? "");
  console.log('NotificationBar - env = ', env);
  console.log('NotificationBar - process.env.NEXT_PUBLIC_ENVIRONMENT = ', process.env.NEXT_PUBLIC_ENVIRONMENT);
  console.log('NotificationBar - process.env.NEXT_PUBLIC_VERSION = ', process.env.NEXT_PUBLIC_VERSION);
  console.log('NotificationBar - process.env.NEXT_PUBLIC_VELHO_BASE_URL = ', process.env.NEXT_PUBLIC_VELHO_BASE_URL);
  console.log('NotificationBar - process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = ', process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE);
  return (
    <div style={{ zIndex: theme.zIndex.appBar }} className="sticky bg-green transition-all">
      <div style={{ width: "100%", textAlign: "center" }} className="">
        <span>YMPÄRISTÖ: {process.env.NEXT_PUBLIC_ENVIRONMENT} </span>
        <span>VERSIO: {process.env.NEXT_PUBLIC_VERSION} </span>
      </div>
    </div>
  );
}
