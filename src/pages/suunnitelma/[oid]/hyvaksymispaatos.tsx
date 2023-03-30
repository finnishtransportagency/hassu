import React, { ReactElement, useMemo } from "react";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import HyvaksymispaatosTiedot from "@components/projekti/kansalaisnakyma/HyvaksymispaatosTiedot";
import PaatosPageLayout from "@components/projekti/kansalaisnakyma/PaatosPageLayout";
import useTranslation from "next-translate/useTranslation";
import EuLogo from "@components/projekti/common/EuLogo";
import { Kieli } from "@services/api";
import { splitFilePath } from "src/util/fileUtil";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import ExtLink from "@components/ExtLink";
import FormatDate from "@components/FormatDate";

export default function Hyvaksymispaatos(): ReactElement {
  const { t } = useTranslation("projekti");
  const { data: projekti } = useProjektiJulkinen();
  const kuulutus = projekti?.hyvaksymisPaatosVaihe;
  const kieli = useKansalaiskieli();

  const saameContent = useMemo(() => {
    if (projekti && projekti.kielitiedot?.toissijainenKieli === Kieli.POHJOISSAAME && kieli === Kieli.SUOMI) {
      const { path, fileExt, fileName } = splitFilePath(
        kuulutus?.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusPDF?.tiedosto || undefined
      );
      return (
        <div>
          <h2 className="vayla-small-title">Gulahus plánema dohkkeheamis</h2>
          {/* Kuulutus suunnitelman hyväksymisestä */}
          <h3 className="vayla-label">{projekti.kielitiedot.projektinNimiVieraskielella}</h3>
          {path && (
            <p>
              <ExtLink className="file_download" href={path} style={{ marginRight: "0.5rem" }}>
                {fileName}
              </ExtLink>{" "}
              ({fileExt}) (
              <FormatDate date={kuulutus?.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusPDF?.tuotu} />)
            </p>
          )}
          <p className="mt-2">
            Mearrádussii sáhttá ohcat váidimiin nuppástusa Lappi hálddahusrievttis 30 beaivvi siste mearrádusa diehtunoažžumis.
            Nuppástusohcama dárkilut rávvagat leat mearrádusa mildosis lean váidinčujuhusas.
            {/*Päätökseen voi valittamalla hakea muutosta Lapin hallinto-oikeudelta 30 päivän kuluessa päätöksen tiedoksisaannista. Muutoksenhaun tarkemmat ohjeet ovat päätöksen liitteenä olevassa valitusosoituksessa. */}
          </p>
        </div>
      );
    } else {
      return null;
    }
  }, [projekti, kieli, kuulutus]);

  if (!projekti || !kuulutus) {
    return <></>;
  }

  return (
    <PaatosPageLayout pageTitle={t("ui-otsikot.kuulutus_suunnitelman_hyvaksymisesta")} saameContent={saameContent}>
      <HyvaksymispaatosTiedot kuulutus={projekti.hyvaksymisPaatosVaihe} />
      <EuLogo projekti={projekti} />
    </PaatosPageLayout>
  );
}
