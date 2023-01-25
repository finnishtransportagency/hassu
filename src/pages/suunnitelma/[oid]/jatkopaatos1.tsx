import React, { ReactElement } from "react";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import HyvaksymispaatosTiedot from "@components/projekti/kansalaisnakyma/HyvaksymispaatosTiedot";
import PaatosPageLayout from "@components/projekti/kansalaisnakyma/PaatosPageLayout";
import useTranslation from "next-translate/useTranslation";
import { Status } from "@services/api";

export default function Hyvaksymispaatos(): ReactElement {
  const { t } = useTranslation("projekti");
  const { data: projekti } = useProjektiJulkinen();
  const kuulutus = projekti?.hyvaksymisPaatosVaihe;

  if (!projekti || !kuulutus) {
    return <div />;
  }

  return (
    <PaatosPageLayout pageTitle={t("ui-otsikot.kuulutus_hyvaksymispaatoksen_jatkamisesta")} selectedStep={Status.JATKOPAATOS_1}>
      <HyvaksymispaatosTiedot kuulutus={projekti.jatkoPaatos1Vaihe} />,
    </PaatosPageLayout>
  );
}
