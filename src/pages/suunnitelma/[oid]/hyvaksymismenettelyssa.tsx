import React, { ReactElement, useEffect } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import useTranslation from "next-translate/useTranslation";
import EuLogo from "@components/projekti/common/EuLogo";
import { useProjektiJulkinen } from "../../../hooks/useProjektiJulkinen";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import { Kieli, Status } from "@services/api";
import { useRouter } from "next/router";
import { getSivuTilanPerusteella } from "@components/kansalaisenEtusivu/Hakutulokset";

export default function Hyvaksymismenettelyssa(): ReactElement {
  const { t } = useTranslation("hyvaksymismenettelyssa");
  const { data: projekti, error } = useProjektiJulkinen();
  const kieli = useKansalaiskieli();
  const router = useRouter();

  useEffect(() => {
    if (projekti && projekti.status === Status.EI_JULKAISTU) router.push(`/suunnitelma/${projekti?.oid}`);
    if (
      projekti &&
      projekti.status &&
      Object.keys(Status).indexOf(projekti.status) < Object.keys(Status).indexOf(Status.HYVAKSYMISMENETTELYSSA_AINEISTOT)
    ) {
      router.push(`/suunnitelma/${projekti?.oid}/${getSivuTilanPerusteella(projekti.status)}`);
    }
  }, [projekti, router]);

  if (error) {
    return <>{t("common:projektin_lataamisessa_virhe")}</>;
  }
  if(!projekti) {
    return <>{t("common:ladataan")}</>;
  }

  return (
    <ProjektiJulkinenPageLayout
      selectedStep={Status.HYVAKSYMISMENETTELYSSA}
      title={t("suunnitelma_on_siirtynyt")}
      vahainenMenettely={projekti?.vahainenMenettely}
    >
      <p>{t("nahtavilla_olon_jalkeen")}</p>
      {projekti && projekti.kielitiedot?.toissijainenKieli === Kieli.POHJOISSAAME && kieli === Kieli.SUOMI && (
        <p aria-label="Suunnitelman saamenkieliset tiedot" lang="se-FI">
          Oaidninláhkái orruma maŋŋá boahtán muittuhusat ja cealkámušat gieđahallojuvvojit ja daid vuođul sáhttá dárbbu mielde dahkat
          nuppástusaid plánii. Loahppagieđahallama maŋŋá plána dohkkehanevttohus sáddejuvvo Johtalus- ja gulahallandoaimmahaga Traficom
          dohkkeheapmái.
        </p>
      )}
      <EuLogo projekti={projekti} />
    </ProjektiJulkinenPageLayout>
  );
}
