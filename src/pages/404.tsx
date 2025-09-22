import React from "react";

import useTranslation from "next-translate/useTranslation";
import { useRouter } from "next/router";
import { H1 } from "@components/Headings";

export default function Custom404() {
  const { t } = useTranslation("common");
  const router = useRouter();

  const isTiedostoSivu = /^(\/yllapito)?\/tiedostot/.test(router.pathname);

  return (
    <>
      <H1>{t(isTiedostoSivu ? "tiedostoa-ei-loydy" : "sivua-ei-loydy")}</H1>
      <p>{t(isTiedostoSivu ? "tiedostoa-ei-loytynyt" : "sivua-ei-loytynyt")}</p>
    </>
  );
}
