import React from "react";
import useTranslation from "next-translate/useTranslation";

function EiJulkaistuSivu() {
  const { t } = useTranslation("common");

  return (
    <>
      <h1>{t("projekti:ui-otsikot.ei-julkaistu")}</h1>
      <p>{t("projekti:ei-julkaistu-selitys")}</p>
    </>
  );
}

export default EiJulkaistuSivu;
