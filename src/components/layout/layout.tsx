import React, { ReactElement, ReactNode } from "react";
import Breadcrumbs, { RouteLabels } from "./Breadcrumbs";
import Header from "./header/header";
import { Footer } from "./footer";
import { Container } from "@mui/material";
import NotificationBar from "@components/notification/NotificationBar";
import ScrollToTopButton from "./ScrollToTopButton";

interface Props {
  children: ReactNode;
  routeLabels: RouteLabels;
}

export default function Layout({ children, routeLabels }: Props): ReactElement {
  return (
    <div className="min-h-screen relative flex flex-col">
      {process.env.NODE_ENV !== "production" && <NotificationBar />}
      <Header />
      <Breadcrumbs routeLabels={routeLabels} />
      <Container sx={{ marginBottom: "110px" }}>
        <main>{children}</main>
      </Container>
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
