import React from "react";

import useTranslation from "next-translate/useTranslation";

export default function Custom404() {
  const { t } = useTranslation("common");
  return (
    <>
      <h1>{t("tiedostoa-ei-loydy")}</h1>
      <p>{t("tiedostoa-ei-loytynyt")}</p>
    </>
  );
}
