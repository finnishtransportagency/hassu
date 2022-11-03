import React from "react";

import useTranslation from "next-translate/useTranslation";
import { useRouter } from "next/router";

export default function Custom404() {
  const router = useRouter();
  console.log(router);
  const { t } = useTranslation("common");
  return <h1>404 - {t("sivua-ei-loydy")}</h1>;
}
