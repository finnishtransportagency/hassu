import React, { ReactElement } from "react";
import { KuulutusJulkaisuTila, IlmoituksenVastaanottajat as IlmoituksenVastaanottajatType } from "@services/api";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import IlmoituksenVastaanottajatCommon from "./IlmoituksenVastaanottajatLukutilaCommon";

interface Props {
  ilmoituksenVastaanottajat: IlmoituksenVastaanottajatType | null | undefined;
  julkaisunTila: KuulutusJulkaisuTila | null | undefined;
  epaaktiivinen?: boolean;
}

export default function IlmoituksenVastaanottajat({
  epaaktiivinen = false,
  ilmoituksenVastaanottajat,
  julkaisunTila,
}: Props): ReactElement {
  return (
    <Section>
      <SectionContent>
        <h5 className="vayla-small-title">Ilmoituksen vastaanottajat</h5>
        {!epaaktiivinen && (
          <>
            <>
              <p>
                Kuulutuksesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville kunnille. Kunnat on haettu
                Projektivelhosta. Jos tiedote pitää lähettää useammalle kuin yhdelle viranomaisorganisaatiolle, lisää uusi rivi Lisää uusi
                -painikkeella.
              </p>
              <p>
                Jos kuntatiedoissa on virhe, tee korjaus ensin Projektivelhoon. Päivitä sen jälkeen korjattu tieto järjestelmään Projektin
                tiedot -sivulla Tuo tiedot -painikkeesta.
              </p>
            </>

            {julkaisunTila === KuulutusJulkaisuTila.HYVAKSYTTY && (
              <p>
                Ilmoitukset on lähetetty eteenpäin alla oleville viranomaisille ja kunnille. Jos ilmoituksen tila on ‘Lähetysvirhe’,
                tarkasta sähköpostiosoite. Ota tarvittaessa yhteys pääkäyttäjään.
              </p>
            )}
          </>
        )}
      </SectionContent>
      <IlmoituksenVastaanottajatCommon ilmoituksenVastaanottajat={ilmoituksenVastaanottajat} />
    </Section>
  );
}
