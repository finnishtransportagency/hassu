import React, { ReactElement } from "react";
import { KuulutusJulkaisuTila, IlmoituksenVastaanottajat as IlmoituksenVastaanottajatType, Status, UudelleenKuulutus } from "@services/api";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import IlmoituksenVastaanottajatCommon from "./IlmoituksenVastaanottajatLukutilaCommon";
import { KiinteistonOmistajatOhjeLukutila, KiinteistonomistajatVaihe } from "./KiinteistonOmistajatOhje";
import { H2 } from "../../Headings";
import { TukiEmailLink } from "../../EiOikeuksia";

interface Props {
  ilmoituksenVastaanottajat: IlmoituksenVastaanottajatType | null | undefined;
  julkaisunTila: KuulutusJulkaisuTila | null | undefined;
  epaaktiivinen?: boolean;
  vaihe?: KiinteistonomistajatVaihe;
  oid: string;
  omistajahakuStatus: Status | null | undefined;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  kuulutusPaiva?: string | null;
}

export default function IlmoituksenVastaanottajat({
  epaaktiivinen = false,
  ilmoituksenVastaanottajat,
  julkaisunTila,
  vaihe,
  oid,
  omistajahakuStatus,
  uudelleenKuulutus,
  kuulutusPaiva,
}: Props): ReactElement {
  return (
    <Section>
      <SectionContent>
        <H2>Ilmoituksen vastaanottajat</H2>
        {!epaaktiivinen && (
          <>
            {julkaisunTila === KuulutusJulkaisuTila.HYVAKSYTTY ? (
              <>
                <p>
                  Ilmoitukset on lähetetty eteenpäin alla oleville viranomaisille ja kunnille. Jos ilmoituksen tila on Ei Lähetetty,
                  tarkasta sähköpostiosoite. Olethan tässä tapauksessa yhteydessä Väylävirastoon <TukiEmailLink />.
                </p>
                <p>Käythän varmistamassa kuulutuksen alkamisen jälkeen, että ilmoitus on julkaistu myös kuntien omilla sivuilla.</p>
              </>
            ) : (
              <>
                <p>
                  Kuulutuksesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville kunnille. Kunnat on haettu
                  Projektivelhosta. Jos tiedote pitää lähettää useammalle kuin yhdelle viranomaisorganisaatiolle, lisää uusi rivi Lisää uusi
                  -painikkeella.
                </p>
                <p>
                  Jos kuntatiedoissa on virhe, tee korjaus ensin Projektivelhoon. Päivitä sen jälkeen korjattu tieto järjestelmään Projektin
                  tiedot -sivulla Päivitä tiedot -painikkeesta. Huomaathan, että tieto ilmoituksesta kulkee ilmoitustaululle
                  automaattisesti.
                </p>
              </>
            )}
          </>
        )}
      </SectionContent>
      <IlmoituksenVastaanottajatCommon ilmoituksenVastaanottajat={ilmoituksenVastaanottajat} />
      {vaihe && (
        <KiinteistonOmistajatOhjeLukutila
          vaihe={vaihe}
          oid={oid}
          omistajahakuStatus={omistajahakuStatus}
          uudelleenKuulutus={uudelleenKuulutus}
          kuulutusPaiva={kuulutusPaiva}
          julkaisunTila={julkaisunTila}
        />
      )}
    </Section>
  );
}
