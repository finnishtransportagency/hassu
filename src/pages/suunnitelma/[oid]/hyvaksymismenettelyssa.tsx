import React, { ReactElement } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import useTranslation from "next-translate/useTranslation";

export default function Hyvaksymismenettelyssa(): ReactElement {
  const { t } = useTranslation("hyvaksymismenettelyssa");
  return (
    <ProjektiJulkinenPageLayout selectedStep={3} title={t("suunnitelma_on_siirtynyt")}>
      <p>{t("nahtavilla_olon_jalkeen")}</p>
    </ProjektiJulkinenPageLayout>
  );
}
