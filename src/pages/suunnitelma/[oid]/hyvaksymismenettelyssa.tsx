import React, { ReactElement } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import useTranslation from "next-translate/useTranslation";
import { Status } from "@services/api";

export default function Hyvaksymismenettelyssa(): ReactElement {
  const { t } = useTranslation("hyvaksymismenettelyssa");
  return (
    <ProjektiJulkinenPageLayout selectedStep={Status.HYVAKSYMISMENETTELYSSA} title={t("suunnitelma_on_siirtynyt")}>
      <p>{t("nahtavilla_olon_jalkeen")}</p>
    </ProjektiJulkinenPageLayout>
  );
}
