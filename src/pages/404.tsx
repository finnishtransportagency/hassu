import React from "react";

import useTranslation from "next-translate/useTranslation";

export default function Custom404() {
  const { t } = useTranslation("common");
  return <h1>404 - {t("sivua-ei-loydy")}</h1>;
}
