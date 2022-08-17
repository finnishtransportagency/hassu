import React, { ReactElement } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import useTranslation from "next-translate/useTranslation";
import useProjektiBreadcrumbsJulkinen from "src/hooks/useProjektiBreadcrumbsJulkinen";
import { PageProps } from "@pages/_app";

export default function Hyvaksymismenettelyssa({ setRouteLabels }: PageProps): ReactElement {
  useProjektiBreadcrumbsJulkinen(setRouteLabels);
  const { t } = useTranslation("hyvaksymismenettelyssa");
  return (
    <ProjektiJulkinenPageLayout selectedStep={3} title={t("suunnitelma_on_siirtynyt")}>
      <p>{t("nahtavilla_olon_jalkeen")}</p>
    </ProjektiJulkinenPageLayout>
  );
}
