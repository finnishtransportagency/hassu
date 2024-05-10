import React, { ReactElement, useEffect } from "react";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import HyvaksymispaatosTiedot from "@components/projekti/kansalaisnakyma/HyvaksymispaatosTiedot";
import PaatosPageLayout from "@components/projekti/kansalaisnakyma/PaatosPageLayout";
import useTranslation from "next-translate/useTranslation";
import SaameContent from "@components/projekti/kansalaisnakyma/SaameContent";
import { Status } from "@services/api";
import { useRouter } from "next/router";
import { getSivuTilanPerusteella } from "@components/kansalaisenEtusivu/Hakutulokset";
import { PaatosTyyppi } from "common/hyvaksymisPaatosUtil";

export default function Hyvaksymispaatos(): ReactElement {
  const { t } = useTranslation("projekti");
  const { data: projekti, error } = useProjektiJulkinen();
  const kuulutus = projekti?.hyvaksymisPaatosVaihe;
  const SAAME_CONTENT_TEXTS = {
    otsikko: "Gulahus plánema dohkkeheamis",
    kappale1:
      "Mearrádussii sáhttá ohcat váidimiin nuppástusa Lappi hálddahusrievttis 30 beaivvi siste mearrádusa diehtunoažžumis. Nuppástusohcama dárkilut rávvagat leat mearrádusa mildosis lean váidinčujuhusas.",
  };

  const router = useRouter();

  useEffect(() => {
    if (projekti && projekti.status === Status.EI_JULKAISTU) router.push(`/suunnitelma/${projekti?.oid}`);
    if (projekti && !projekti.hyvaksymisPaatosVaihe) {
      router.push(`/suunnitelma/${projekti?.oid}/${getSivuTilanPerusteella(projekti?.status)}`);
    }
  }, [projekti, router]);

  if (error) {
    return <>{t("common:projektin_lataamisessa_virhe")}</>;
  }
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
      <HyvaksymispaatosTiedot kuulutus={projekti.hyvaksymisPaatosVaihe} paatosTyyppi={PaatosTyyppi.HYVAKSYMISPAATOS} />
    </PaatosPageLayout>
  );
}
