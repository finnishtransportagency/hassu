import React, { useState, useEffect, ReactElement, ReactNode } from "react";
import Breadcrumbs, { RouteLabels } from "./Breadcrumbs";
import Header from "./header/header";
import { Footer } from "./footer";
import { Container } from "@mui/material";

interface Props {
  children: ReactNode;
  routeLabels: RouteLabels;
}

export default function Layout({ children, routeLabels }: Props): ReactElement {
  const toTopEnableOffset = 100;
  const [toTopEnabled, setToTopEnabled] = useState(false);

  useEffect(() => {
    window.addEventListener("scroll", () => {
      if (window.pageYOffset > toTopEnableOffset) {
        setToTopEnabled(true);
      } else {
        setToTopEnabled(false);
      }
    });
  }, []);

  return (
    <div className="min-h-screen relative flex flex-col">
      <Header scrolledPastOffset={toTopEnabled} />
      <Breadcrumbs routeLabels={routeLabels} />
      <Container sx={{ marginBottom: "110px" }}>
        <main>{children}</main>
      </Container>
      <Footer />
      <button
        id="to-top-button"
        onClick={() => {
          window.scrollTo(0, 0);
        }}
        className={`fixed bottom-6 right-6 bg-primary text-white rounded p-4 ${!toTopEnabled ? "hidden" : ""}`}
      >
        To Top
      </button>
    </div>
  );
}
