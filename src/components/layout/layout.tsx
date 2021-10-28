import React, { useState, useEffect, ReactElement, ReactNode } from "react";
import Breadcrumbs, { RouteLabels } from "./Breadcrumbs";
import { Header } from "./header";
import { Footer } from "./footer";

interface Props {
  children: ReactNode;
  routeLabels: RouteLabels;
}

export default function Layout({ children, routeLabels }: Props): ReactElement {
  const headerOffset = 70;
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
      <Breadcrumbs routeLabels={routeLabels} />
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
