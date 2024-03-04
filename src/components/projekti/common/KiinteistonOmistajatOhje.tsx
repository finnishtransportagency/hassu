import StyledLink from "@components/StyledLink";
import SectionContent from "@components/layout/SectionContent";
import Notification, { NotificationType } from "@components/notification/Notification";
import { ProjektinTiedottaminen, Vaihe } from "@services/api";
import { useProjektinTiedottaminen } from "src/hooks/useProjektinTiedottaminen";
import useSuomifiUser from "src/hooks/useSuomifiUser";

interface ProjektinTilaProps {
  tiedottaminen: ProjektinTiedottaminen;
  vaihe: KiinteistonomistajatVaihe;
}

function KiinteistojaEiLisatty({ tiedottaminen: projektinTila }: ProjektinTilaProps) {
  return (
    <>
      <p>
        Kiinteistönomistajien tietoja ei ole lisätty Tiedottaminen-sivun{" "}
        <StyledLink href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid: projektinTila?.oid } }}>
          Kiinteistönomistajat
        </StyledLink>{" "}
        -välilehdelle.
      </p>
      <Notification type={NotificationType.WARN}>
        Kiinteistönomistajatiedot puuttuvat. Lisää kiinteistönomistajien tiedot Tiedottaminen-sivulle ennen jatkamista.
      </Notification>
    </>
  );
}

function KiinteistotLisatty({ tiedottaminen, vaihe }: ProjektinTilaProps) {
  if (vaihe === Vaihe.NAHTAVILLAOLO) {
    return (
      <p>
        Tarkasta kiinteistönomistajien vastaanottajalista Tiedottaminen-sivun{" "}
        <StyledLink href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid: tiedottaminen?.oid } }}>
          Kiinteistönomistajat
        </StyledLink>{" "}
        -välilehdeltä. Kiinteistönomistajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään
        julkaistavaksi.
      </p>
    );
  } else {
    return (
      <p>
        Tarkasta kiinteistönomistajien ja muistuttajien vastaanottajalista{" "}
        <StyledLink href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid: tiedottaminen?.oid } }}>
          Tiedottaminen
        </StyledLink>
        -sivulta Kiinteistönomistajat- ja Muistuttajat -välilehdiltä. Vastaanottajalista viedään automaattisesti asianhallintaan, kun
        kuulutus hyväksytään julkaistavaksi.
      </p>
    );
  }
}

export type KiinteistonomistajatVaihe = Vaihe.NAHTAVILLAOLO | Vaihe.HYVAKSYMISPAATOS;
interface KiinteistonomistajatOhjeProps {
  vaihe?: KiinteistonomistajatVaihe;
}

export default function KiinteistonomistajatOhje({ vaihe }: KiinteistonomistajatOhjeProps) {
  const { data } = useSuomifiUser();
  const { data: tiedottaminen } = useProjektinTiedottaminen({ refreshInterval: 0 });
  if (data?.suomifiEnabled && tiedottaminen && vaihe) {
    return (
      <SectionContent>
        <h6 className="font-bold">{vaihe === Vaihe.NAHTAVILLAOLO ? "Kiinteistönomistajat" : "Kiinteistönomistajat ja muistuttajat"}</h6>
        {tiedottaminen.omistajahakuStatus !== null ? (
          <KiinteistotLisatty tiedottaminen={tiedottaminen} vaihe={vaihe} />
        ) : (
          <KiinteistojaEiLisatty tiedottaminen={tiedottaminen} vaihe={vaihe} />
        )}
      </SectionContent>
    );
  } else {
    return <></>;
  }
}

export function KiinteistonOmistajatOhjeLukutila({ vaihe }: KiinteistonomistajatOhjeProps) {
  const { data } = useSuomifiUser();
  const { data: tiedottaminen } = useProjektinTiedottaminen({ refreshInterval: 0 });
  if (data?.suomifiEnabled && vaihe === Vaihe.NAHTAVILLAOLO) {
    return (
      <SectionContent>
        <h6 className="font-bold">Kiinteistönomistajat</h6>
        <p>
          Lista kuulutuksen ilmoituksen vastaanottaneista kiinteistönomistajista muodostuu asianhallintaan kuulutuksen julkaisupäivänä. Osaa
          kiinteistönomistajia tiedotetaan automaattisesti Suomi.fi-palvelun kautta. Loppuja tulee tiedottaa kirjeitse. Kirjeitse
          tiedotettavat löytyvät{" "}
          <StyledLink
            href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid: tiedottaminen?.oid } }}
          >
            Tiedottaminen
          </StyledLink>{" "}
          -sivun Kiinteistönomistajien tiedotus muilla tavoin -listasta.
        </p>
      </SectionContent>
    );
  } else if (data?.suomifiEnabled && vaihe === Vaihe.HYVAKSYMISPAATOS) {
    return (
      <SectionContent>
        <h6 className="font-bold">Kiinteistönomistajat ja muistuttajat</h6>
        <p>
          Lista kuulutuksen ja ilmoituksen vastaanottaneista kiinteistönomistajista ja muistuttajista muodostuu asianhallintaan kuulutuksen
          julkaisupäivänä.
        </p>
        <p>
          Osaa kiinteistönomistajia ja muistuttajia tiedotetaan automaattisesti Suomi.fi-palvelun kautta. Loppuja tulee tiedottaa kirjeitse.
          Kirjeitse tiedotettavat löytyvät{" "}
          <StyledLink
            href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid: tiedottaminen?.oid } }}
          >
            Tiedottaminen
          </StyledLink>{" "}
          -sivun Kiinteistönomistajien tiedotus muilla tavoin - ja Muistuttajien tiedotus muilla tavoin -listoista.
        </p>
      </SectionContent>
    );
  } else {
    return <></>;
  }
}
