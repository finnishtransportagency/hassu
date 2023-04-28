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
  julkaisu: VuorovaikutusKierrosJulkaisu;
  projekti: Projekti;
}

export default function LukutilaLinkkiJaKutsut({ julkaisu, projekti }: Props): ReactElement {
  if (!julkaisu) {
    return <></>;
  }

  let { julkaisuPaiva, published } = examineJulkaisuPaiva(true, julkaisu.vuorovaikutusJulkaisuPaiva);

  const kielitiedot = julkaisu.kielitiedot || projekti.kielitiedot;

  const { ensisijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);
  const toissijainenKieli = kielitiedot?.toissijainenKieli;

  const ensisijainenKutsuPDFPath = ensisijainenKaannettavaKieli
    ? julkaisu.vuorovaikutusPDFt?.[ensisijainenKaannettavaKieli]?.kutsuPDFPath
    : undefined;

  const toisSijainenKutsuPDFPath = toissijainenKieli
    ? isKieliTranslatable(toissijainenKieli)
      ? julkaisu.vuorovaikutusPDFt?.[toissijainenKieli]?.kutsuPDFPath
      : julkaisu.vuorovaikutusSaamePDFt?.POHJOISSAAME?.tiedosto
    : undefined;

  const toisSijainenKutsuPDFFileName = toissijainenKieli
    ? isKieliTranslatable(toissijainenKieli)
      ? splitFilePath(julkaisu.vuorovaikutusPDFt?.[toissijainenKieli]?.kutsuPDFPath).fileName
      : julkaisu.vuorovaikutusSaamePDFt?.POHJOISSAAME?.nimi
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
