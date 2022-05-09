import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import React, { ReactElement, useMemo } from "react";
import {
  Vuorovaikutus,
  Projekti,
  Kieli
} from "@services/api";
import { examineJulkaisuPaiva } from "src/util/dateUtils";
import { Link } from "@mui/material";
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

  const aloituskuulutusjulkaisu = useMemo(() => {
    return projekti?.aloitusKuulutusJulkaisut?.[projekti?.aloitusKuulutusJulkaisut?.length - 1 || 0];
  }, [projekti]);

  const ensisijainenKieli = aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli || Kieli.SUOMI;
  const toissijainenKieli = aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli || Kieli.RUOTSI;


  return (
    <Section>
      <SectionContent>
        <p className="vayla-label mb-5">Kutsu vuorovaikuttamiseen julkisella puolella</p>
        {published
          ? <p><Link underline="none" href={`/suunnitelma/${projekti.oid}/suunnittelu`}>Linkki</Link></p>
          : <p>Linkki julkiselle puolelle muodostetaan vuorovaikuttamisen julkaisupäivänä. Julkaisupäivä {julkaisuPaiva}. </p>
        }
        <p className="vayla-label mb-5">Ladattavat kutsut ja ilmoitukset</p>
        <div>Kutsu ja ilmoitus pääkielellä ({lowerCase(ensisijainenKieli)})</div>
        <div><Link underline="none" href="#">Linkki</Link></div>
        <div><Link underline="none" href="#">Linkki2</Link></div>
        <div>Kutsu ja ilmoitus toisella kielellä ({lowerCase(toissijainenKieli)})</div>
        <div><Link underline="none" href="#">Linkki</Link></div>
        <div><Link underline="none" href="#">Linkki2</Link></div>
      </SectionContent>
    </Section>
  );
}