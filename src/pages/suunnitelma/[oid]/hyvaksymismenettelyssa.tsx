import React, { ReactElement } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import useTranslation from "next-translate/useTranslation";
import EuLogo from "@components/projekti/common/EuLogo";
import { useProjektiJulkinen } from "../../../hooks/useProjektiJulkinen";

export default function Hyvaksymismenettelyssa(): ReactElement {
  const { t } = useTranslation("hyvaksymismenettelyssa");
  const { data: projekti } = useProjektiJulkinen();
  return (
    <ProjektiJulkinenPageLayout selectedStep={3} title={t("suunnitelma_on_siirtynyt")}>
      <p>{t("nahtavilla_olon_jalkeen")}</p>
      <EuLogo projekti={projekti} />
    </ProjektiJulkinenPageLayout>
  );
}
