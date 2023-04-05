import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import React, { ReactElement } from "react";
import { Projekti, VuorovaikutusKierrosJulkaisu } from "@services/api";
import { examineJulkaisuPaiva } from "common/util/dateUtils";
import { Link } from "@mui/material";
import ExtLink from "@components/ExtLink";
import lowerCase from "lodash/lowerCase";
import { splitFilePath } from "../../../../util/fileUtil";
import { getKaannettavatKielet, isKieliTranslatable } from "common/kaannettavatKielet";

interface Props {
  vuorovaikutus: VuorovaikutusKierrosJulkaisu;
  projekti: Projekti;
}

export default function LukutilaLinkkiJaKutsut({ vuorovaikutus, projekti }: Props): ReactElement {
  if (!vuorovaikutus) {
    return <></>;
  }

  let { julkaisuPaiva, published } = examineJulkaisuPaiva(true, vuorovaikutus.vuorovaikutusJulkaisuPaiva);

  const { ensisijainenKaannettavaKieli } = getKaannettavatKielet(projekti.kielitiedot);
  const toissijainenKieli = projekti.kielitiedot?.toissijainenKieli;

  const ensisijainenKutsuPDFPath = ensisijainenKaannettavaKieli
    ? vuorovaikutus.vuorovaikutusPDFt?.[ensisijainenKaannettavaKieli]?.kutsuPDFPath
    : undefined;

  const toisSijainenKutsuPDFPath = toissijainenKieli
    ? isKieliTranslatable(toissijainenKieli)
      ? vuorovaikutus.vuorovaikutusPDFt?.[toissijainenKieli]?.kutsuPDFPath
      : vuorovaikutus.vuorovaikutusSaamePDFt?.POHJOISSAAME?.tiedosto
    : undefined;

  const toisSijainenKutsuPDFFileName = toissijainenKieli
    ? isKieliTranslatable(toissijainenKieli)
      ? splitFilePath(vuorovaikutus.vuorovaikutusPDFt?.[toissijainenKieli]?.kutsuPDFPath).fileName
      : vuorovaikutus.vuorovaikutusSaamePDFt?.POHJOISSAAME?.nimi
    : undefined;

  return (
    <Section>
      <SectionContent>
        <p className="vayla-label mb-5">Kutsu vuorovaikuttamiseen julkisella puolella</p>
        {published ? (
          <p>
            <ExtLink href={`/suunnitelma/${projekti.oid}/suunnittelu`}>Linkki palvelun julkiselle puolelle</ExtLink>
          </p>
        ) : (
          <p>Linkki julkiselle puolelle muodostetaan vuorovaikuttamisen julkaisupäivänä. Julkaisupäivä {julkaisuPaiva}. </p>
        )}
        {ensisijainenKaannettavaKieli && (
          <>
            <p className="vayla-label mb-5">Ladattavat kutsut ja ilmoitukset</p>
            <div>Kutsu pääkielellä ({lowerCase(ensisijainenKaannettavaKieli)})</div>
            <div>
              <Link className="file_download" underline="none" href={ensisijainenKutsuPDFPath} target="_blank">
                {splitFilePath(ensisijainenKutsuPDFPath).fileName}
              </Link>
            </div>
          </>
        )}
        {toissijainenKieli && toisSijainenKutsuPDFPath && (
          <>
            <div>Kutsu toisella kielellä ({lowerCase(toissijainenKieli)})</div>
            <div>
              <Link className="file_download" underline="none" href={toisSijainenKutsuPDFPath} target="_blank">
                {toisSijainenKutsuPDFFileName}
              </Link>
            </div>
          </>
        )}
      </SectionContent>
    </Section>
  );
}
