import React, { ReactElement } from "react";
import { KuulutusJulkaisuTila, IlmoituksenVastaanottajat as IlmoituksenVastaanottajatType, Status, UudelleenKuulutus } from "@services/api";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import IlmoituksenVastaanottajatCommon from "./IlmoituksenVastaanottajatLukutilaCommon";
import { KiinteistonOmistajatOhjeLukutila, KiinteistonomistajatVaihe } from "./KiinteistonOmistajatOhje";
import { H2 } from "../../Headings";
import { TukiEmailLink } from "../../EiOikeuksia";
import { PaatosTyyppi } from "common/hyvaksymisPaatosUtil";

interface Props {
  ilmoituksenVastaanottajat: IlmoituksenVastaanottajatType | null | undefined;
  julkaisunTila: KuulutusJulkaisuTila | null | undefined;
  epaaktiivinen?: boolean;
  vaihe?: KiinteistonomistajatVaihe;
  oid: string;
  omistajahakuStatus: Status | null | undefined;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  kuulutusPaiva?: string | null;
  paatosTyyppi?: PaatosTyyppi;
}

interface InfoTextProps {
  paatosTyyppi?: PaatosTyyppi;
}

export function InfoText(props: Readonly<InfoTextProps>) {
  if (props.paatosTyyppi === undefined || props.paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS) {
    return (
      <>
        <p>
          Kuulutuksesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville kunnille. Kunnat on haettu
          Projektivelhosta. Jos tiedote pitää lähettää useammalle kuin yhdelle viranomaisorganisaatiolle, lisää uusi rivi Lisää uusi
          -painikkeella.
        </p>
        <p>
          Jos kuntatiedoissa on virhe, tee korjaus ensin Projektivelhoon. Päivitä sen jälkeen korjattu tieto järjestelmään Projektin tiedot
          -sivulla Päivitä tiedot -painikkeesta. Huomaathan, että tieto ilmoituksesta kulkee ilmoitustaululle automaattisesti.
        </p>
      </>
    );
  } else {
    return (
      <>
        <p>
          Kuulutuksesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville kunnille ja maakuntaliitoille. Kunnat on
          haettu Projektivelhosta, maakuntaliitto määräytyy Projektivelhossa asetetun maakunnan mukaan. Jos tiedote pitää lähettää
          useammalle kuin yhdelle viranomaisorganisaatiolle, lisää uusi rivi Lisää uusi -painikkeella.
        </p>
        <p>
          Jos kunta- tai maakuntatiedoissa on virhe, tee korjaus ensin Projektivelhoon. Päivitä sen jälkeen korjattu tieto järjestelmään
          Projektin tiedot -sivulla Päivitä tiedot -painikkeesta. Huomaathan, että tieto ilmoituksesta kulkee ilmoitustaululle
          automaattisesti.
        </p>
      </>
    );
  }
}

function HyvaksyttyInfoText(props: Readonly<InfoTextProps>) {
  if (props.paatosTyyppi === undefined || props.paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS) {
    return (
      <>
        <p>
          Ilmoitukset on lähetetty eteenpäin alla oleville viranomaisille ja kunnille. Jos ilmoituksen tila on Ei Lähetetty, tarkasta
          sähköpostiosoite. Olethan tässä tapauksessa yhteydessä Väylävirastoon <TukiEmailLink />.
        </p>
        <p>Käythän varmistamassa kuulutuksen alkamisen jälkeen, että ilmoitus on julkaistu myös kuntien omilla sivuilla.</p>
      </>
    );
  } else {
    return (
      <>
        <p>
          Ilmoitukset on lähetetty eteenpäin alla oleville viranomaisille, kunnille ja maakuntaliitoille. Jos ilmoituksen tila on Ei
          Lähetetty, tarkasta sähköpostiosoite. Olethan tässä tapauksessa yhteydessä Väylävirastoon <TukiEmailLink />.
        </p>
        <p>Käythän varmistamassa kuulutuksen alkamisen jälkeen, että ilmoitus on julkaistu myös kuntien omilla sivuilla.</p>
      </>
    );
  }
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
  paatosTyyppi,
}: Readonly<Props>): ReactElement {
  return (
    <Section>
      <SectionContent>
        <H2>Ilmoituksen vastaanottajat</H2>
        {!epaaktiivinen && (
          <>
            {julkaisunTila === KuulutusJulkaisuTila.HYVAKSYTTY ? (
              <HyvaksyttyInfoText paatosTyyppi={paatosTyyppi} />
            ) : (
              <InfoText paatosTyyppi={paatosTyyppi} />
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
