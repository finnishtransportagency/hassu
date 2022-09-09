import { Container } from "@mui/material";
import React, { ReactElement } from "react";

export interface HeaderProps {
  scrolledPastOffset: boolean;
}

export default function NotificationBar(): ReactElement {
  return (
    <Container className="sticky bg-green z-20 w-full transition-all" >
      <div style={{ width: "100%", textAlign: "center" }} className="">
        <span>YMPÄRISTÖ: {process.env.ENVIRONMENT} </span>
        <span>VERSIO: {process.env.VERSION} </span>
      </div>
    </Container>
  );
}
