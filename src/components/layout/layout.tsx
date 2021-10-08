import React, { useState, useEffect, ReactElement } from "react";
import Breadcrumbs, { RouteLabels } from "./Breadcrumbs";
import { Header } from "./header";
import { Footer } from "./footer";

interface Props {
  children: JSX.Element;
  routeMapping: RouteLabels;
}

export default function Layout({ children, routeMapping }: Props): ReactElement {
  const headerOffset = 184;
  const [toTopEnabled, setToTopEnabled] = useState(false);

  useEffect(() => {
    window.addEventListener("scroll", () => {
      if (window.pageYOffset > headerOffset) {
        setToTopEnabled(true);
      } else {
        setToTopEnabled(false);
      }
    });
  }, []);

  return (
    <div className="min-h-screen relative flex flex-col">
      <Header top={toTopEnabled ? -headerOffset : 0} />
      <Breadcrumbs routeLabels={routeMapping} />
      <main className="container mb-6">{children}</main>
      <Footer />
      <button
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
