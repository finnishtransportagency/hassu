import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import React, { ReactElement } from "react";
import { Kieli, Projekti, VuorovaikutusKierrosJulkaisu } from "@services/api";
import { examineJulkaisuPaiva } from "src/util/dateUtils";
import { Link } from "@mui/material";
import ExtLink from "@components/ExtLink";
import lowerCase from "lodash/lowerCase";
import { splitFilePath } from "../../../util/fileUtil";

interface Props {
  vuorovaikutus: VuorovaikutusKierrosJulkaisu;
  projekti: Projekti;
}

export default function LukutilaLinkkiJaKutsut({ vuorovaikutus, projekti }: Props): ReactElement {
  if (!vuorovaikutus) {
    return <></>;
  }

  let { julkaisuPaiva, published } = examineJulkaisuPaiva(true, vuorovaikutus.vuorovaikutusJulkaisuPaiva);

  const ensisijainenKieli = projekti.kielitiedot?.ensisijainenKieli || Kieli.SUOMI;
  const toissijainenKieli = projekti.kielitiedot?.toissijainenKieli;

  const ensisijainenPDFPath = vuorovaikutus.vuorovaikutusPDFt?.[ensisijainenKieli]?.kutsuPDFPath;
  const toisSijainenPDFPath = toissijainenKieli ? vuorovaikutus.vuorovaikutusPDFt?.[toissijainenKieli]?.kutsuPDFPath : undefined;

  return (
    <Section>
      <SectionContent>
        <p className="vayla-label mb-5">Kutsu vuorovaikuttamiseen julkisella puolella</p>
        {published ? (
          <p>
            <ExtLink href={`/suunnitelma/${projekti.oid}/suunnittelu`}>Linkki</ExtLink>
          </p>
        ) : (
          <p>Linkki julkiselle puolelle muodostetaan vuorovaikuttamisen julkaisupäivänä. Julkaisupäivä {julkaisuPaiva}. </p>
        )}
        {ensisijainenPDFPath && (
          <>
            <p className="vayla-label mb-5">Ladattavat kutsut ja ilmoitukset</p>
            <div>Kutsu ja ilmoitus pääkielellä ({lowerCase(ensisijainenKieli)})</div>
            <div>
              <Link underline="none" href={ensisijainenPDFPath} target="_blank">
                {splitFilePath(ensisijainenPDFPath).fileName}
              </Link>
            </div>
          </>
        )}
        {toissijainenKieli && toisSijainenPDFPath && (
          <>
            <div>Kutsu ja ilmoitus toisella kielellä ({lowerCase(toissijainenKieli)})</div>
            <div>
              <Link underline="none" href={toisSijainenPDFPath} target="_blank">
                {splitFilePath(toisSijainenPDFPath).fileName}
              </Link>
            </div>
          </>
        )}
      </SectionContent>
    </Section>
  );
}
