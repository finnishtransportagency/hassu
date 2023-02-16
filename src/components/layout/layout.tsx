import React, { ReactElement, ReactNode } from "react";
import Breadcrumbs from "./Breadcrumbs";
import Header from "./header/header";
import { Footer } from "./footer";
import { Container } from "@mui/material";
import NotificationBar from "@components/notification/NotificationBar";
import ScrollToTopButton from "./ScrollToTopButton";

interface Props {
  children?: ReactNode;
}

export default function Layout({ children }: Props): ReactElement {
  return (
    <div className="min-h-screen relative flex flex-col">
      {process.env.ENVIRONMENT !== "prod" && <NotificationBar />}
      <Header />
      <Breadcrumbs />
      <Container sx={{ marginBottom: "110px" }}>
        <main>{children}</main>
      </Container>
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
