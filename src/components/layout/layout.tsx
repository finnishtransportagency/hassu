import React, { ReactElement, ReactNode } from "react";
import Breadcrumbs from "./Breadcrumbs";
import Header from "./header/header";
import { Footer } from "./footer";
import { Container } from "@mui/material";
import NotificationBar from "@components/notification/NotificationBar";
import ScrollToTopButton from "./ScrollToTopButton";
import { useRouter } from "next/router";

interface Props {
  children?: ReactNode;
}

export default function Layout({ children }: Props): ReactElement {
  const { route } = useRouter();
  if (
    route.includes("lausuntopyyntoaineistot") ||
    route.includes("lausuntopyynnon-taydennysaineistot") ||
    route.includes("hyvaksymisesitysaineistot")
  ) {
    return (
      <div className="min-h-screen relative flex flex-col">
        {process.env.ENVIRONMENT !== "prod" && <NotificationBar />}

        <Container sx={{ marginBottom: "110px", marginTop: "50px" }}>
          <main>{children}</main>
        </Container>
        <ScrollToTopButton />
      </div>
    );
  }

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
