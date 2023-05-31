import React, { ReactElement } from "react";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import HyvaksymispaatosTiedot from "@components/projekti/kansalaisnakyma/HyvaksymispaatosTiedot";
import PaatosPageLayout from "@components/projekti/kansalaisnakyma/PaatosPageLayout";
import useTranslation from "next-translate/useTranslation";
import EuLogo from "@components/projekti/common/EuLogo";
import SaameContent from "@components/projekti/kansalaisnakyma/SaameContent";

export default function Hyvaksymispaatos(): ReactElement {
  const { t } = useTranslation("projekti");
  const { data: projekti } = useProjektiJulkinen();
  const kuulutus = projekti?.hyvaksymisPaatosVaihe;
  const SAAME_CONTENT_TEXTS = {
    otsikko: "Gulahus plánema dohkkeheamis",
    kappale1:
      "Mearrádussii sáhttá ohcat váidimiin nuppástusa Lappi hálddahusrievttis 30 beaivvi siste mearrádusa diehtunoažžumis. Nuppástusohcama dárkilut rávvagat leat mearrádusa mildosis lean váidinčujuhusas.",
  };

  if (!projekti || !kuulutus) {
    return <></>;
  }

  return (
    <PaatosPageLayout
      pageTitle={t("ui-otsikot.kuulutus_suunnitelman_hyvaksymisesta")}
      saameContent={
        <SaameContent
          kielitiedot={projekti.kielitiedot}
          kuulutusPDF={kuulutus.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusPDF}
          otsikko={SAAME_CONTENT_TEXTS.otsikko}
          kappale1={SAAME_CONTENT_TEXTS.kappale1}
        />
      }
    >
      <HyvaksymispaatosTiedot kuulutus={projekti.hyvaksymisPaatosVaihe} />
      <EuLogo projekti={projekti} />
    </PaatosPageLayout>
  );
}
