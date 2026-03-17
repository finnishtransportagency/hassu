import React, { useEffect, useState } from "react";
import useTranslation from "next-translate/useTranslation";
import { H1 } from "@components/Headings";

export default function Custom404() {
  const { t } = useTranslation("common");
  const [isTiedostoSivu, setIsTiedostoSivu] = useState(false);

  useEffect(() => {
    setIsTiedostoSivu(/^(\/yllapito)?\/tiedostot/.test(window.location.pathname));
  }, []);

  return (
    <>
      <H1>{t(isTiedostoSivu ? "tiedostoa-ei-loydy" : "sivua-ei-loydy")}</H1>
      <p>{t(isTiedostoSivu ? "tiedostoa-ei-loytynyt" : "sivua-ei-loytynyt")}</p>
    </>
  );
}
