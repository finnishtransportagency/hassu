import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import React, { ReactElement } from "react";
import {
  Vuorovaikutus,
  Projekti,
  Kieli
} from "@services/api";
import { examineJulkaisuPaiva } from "src/util/dateUtils";
import { Link } from "@mui/material";
import ExtLink from "@components/ExtLink";
import lowerCase from "lodash/lowerCase";

interface Props {
  vuorovaikutus: Vuorovaikutus;
  projekti: Projekti;
}


export default function LukutilaLinkkiJaKutsut({
  vuorovaikutus,
  projekti
}: Props): ReactElement {

  let { julkaisuPaiva, published } = examineJulkaisuPaiva(true, vuorovaikutus.vuorovaikutusJulkaisuPaiva);

  const ensisijainenKieli = projekti.kielitiedot?.ensisijainenKieli || Kieli.SUOMI;
  const toissijainenKieli = projekti.kielitiedot?.toissijainenKieli;

  return (
    <Section>
      <SectionContent>
        <p className="vayla-label mb-5">Kutsu vuorovaikuttamiseen julkisella puolella</p>
        {published
          ? <p><ExtLink href={`/suunnitelma/${projekti.oid}/suunnittelu`}>Linkki</ExtLink></p>
          : <p>Linkki julkiselle puolelle muodostetaan vuorovaikuttamisen julkaisupäivänä. Julkaisupäivä {julkaisuPaiva}. </p>
        }
        <p className="vayla-label mb-5">Ladattavat kutsut ja ilmoitukset</p>
        <div>Kutsu ja ilmoitus pääkielellä ({lowerCase(ensisijainenKieli)})</div>
        <div><Link underline="none" href="#">Linkki</Link></div>
        <div><Link underline="none" href="#">Linkki2</Link></div>
        {toissijainenKieli &&
          <>
            <div>Kutsu ja ilmoitus toisella kielellä ({lowerCase(toissijainenKieli)})</div>
            <div><Link underline="none" href="#">Linkki</Link></div>
            <div><Link underline="none" href="#">Linkki2</Link></div>
          </>
        }
      </SectionContent>
    </Section>
  );
}