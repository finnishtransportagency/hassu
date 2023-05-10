import React, { ReactElement } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import useTranslation from "next-translate/useTranslation";
import EuLogo from "@components/projekti/common/EuLogo";
import { useProjektiJulkinen } from "../../../hooks/useProjektiJulkinen";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import { Kieli } from "@services/api";

export default function Hyvaksymismenettelyssa(): ReactElement {
  const { t } = useTranslation("hyvaksymismenettelyssa");
  const { data: projekti } = useProjektiJulkinen();
  const kieli = useKansalaiskieli();
  return (
    <ProjektiJulkinenPageLayout selectedStep={3} title={t("suunnitelma_on_siirtynyt")}>
      <p>{t("nahtavilla_olon_jalkeen")}</p>
      { projekti && projekti.kielitiedot?.toissijainenKieli === Kieli.POHJOISSAAME && kieli === Kieli.SUOMI && (
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
