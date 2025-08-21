import React, { ReactElement, ReactNode } from "react";
import dynamic from "next/dynamic";
import Breadcrumbs from "./Breadcrumbs";
import Header from "./header/header";
import { Footer } from "./footer";
import { Container } from "@mui/material";
import ScrollToTopButton from "./ScrollToTopButton";
import { useRouter } from "next/router";
import { getEnvironment } from "src/util/getEnvironment";

// Renderöidään NotificationBar vain clientilla (ssr: false),
// jotta vältytään ensimmäisen latauksen aikaiselta vilkkumiselta,
// kun buildin aikaiset environment-arvot eivät vielä vastaa clientin arvoja
const NotificationBar = dynamic(() => import("@components/notification/NotificationBar"), {
  ssr: false,
});


interface Props {
  children?: ReactNode;
}

export default function Layout({ children }: Props): ReactElement {
  const { route } = useRouter();

  // Ympäristömuuttujan haku kierrätetään funktion kautta, jotta Next.js/webpack
  // ei arvioi sitä käännösaikana vakioksi. Näin varmistetaan, että
  // ehdollisia komponentteja (kuten && <NotificationBar/>) ei poisteta buildissa
  // tree-shakingin takia, koska varsinainen ympäristöarvo selviää vasta juuri ennen ajoa (entrypoint.sh).
  const env = getEnvironment(process.env.NEXT_PUBLIC_ENVIRONMENT ?? "");

  if (
    route.includes("lausuntopyyntoaineistot") ||
    route.includes("lausuntopyynnon-taydennysaineistot") ||
    route.includes("hyvaksymisesitysaineistot") ||
    route.includes("ennakkoneuvotteluaineistot") ||
    route.includes("esikatsele-ennakkoneuvottelu") ||
    route.includes("esikatsele-hyvaksymisesitys") ||
    route.includes("esikatsele-hyvaksyttava-hyvaksymisesitys")
  ) {
    return (
      <div className="min-h-screen relative flex flex-col">
        {env !== "prod" && <NotificationBar />}

        <Container sx={{ marginBottom: "110px", marginTop: "50px" }}>
          <main>{children}</main>
        </Container>
        <ScrollToTopButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col">
      {env !== "prod" && <NotificationBar />}
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
