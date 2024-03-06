import StyledLink from "@components/StyledLink";
import SectionContent from "@components/layout/SectionContent";
import Notification, { NotificationType } from "@components/notification/Notification";
import { Status, Vaihe } from "@services/api";
import useSuomifiUser from "src/hooks/useSuomifiUser";

export type KiinteistonomistajatVaihe = Vaihe.NAHTAVILLAOLO | Vaihe.HYVAKSYMISPAATOS;
interface KiinteistonomistajatOhjeProps {
  vaihe?: KiinteistonomistajatVaihe;
  oid: string;
  omistajahakuStatus: Status | null | undefined;
}

function KiinteistojaEiLisatty({ oid }: KiinteistonomistajatOhjeProps) {
  return (
    <>
      <p>
        Kiinteistönomistajien tietoja ei ole lisätty Tiedottaminen-sivun{" "}
        <StyledLink href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid } }}>
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

function KiinteistotLisatty({ oid, vaihe }: KiinteistonomistajatOhjeProps) {
  if (vaihe === Vaihe.NAHTAVILLAOLO) {
    return (
      <p>
        Tarkasta kiinteistönomistajien vastaanottajalista Tiedottaminen-sivun{" "}
        <StyledLink href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid } }}>
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
        <StyledLink href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid } }}>
          Tiedottaminen
        </StyledLink>
        -sivulta Kiinteistönomistajat- ja Muistuttajat -välilehdiltä. Vastaanottajalista viedään automaattisesti asianhallintaan, kun
        kuulutus hyväksytään julkaistavaksi.
      </p>
    );
  }
}

export default function KiinteistonomistajatOhje({ vaihe, oid, omistajahakuStatus }: KiinteistonomistajatOhjeProps) {
  const { data } = useSuomifiUser();
  if (data?.suomifiViestitEnabled && vaihe) {
    return (
      <SectionContent>
        <h6 className="font-bold">{vaihe === Vaihe.NAHTAVILLAOLO ? "Kiinteistönomistajat" : "Kiinteistönomistajat ja muistuttajat"}</h6>
        {omistajahakuStatus ? (
          <KiinteistotLisatty oid={oid} vaihe={vaihe} omistajahakuStatus={omistajahakuStatus} />
        ) : (
          <KiinteistojaEiLisatty oid={oid} vaihe={vaihe} omistajahakuStatus={omistajahakuStatus} />
        )}
      </SectionContent>
    );
  } else {
    return <></>;
  }
}

export function KiinteistonOmistajatOhjeLukutila({ vaihe, oid }: KiinteistonomistajatOhjeProps) {
  const { data } = useSuomifiUser();
  if (data?.suomifiViestitEnabled && vaihe === Vaihe.NAHTAVILLAOLO) {
    return (
      <SectionContent>
        <h6 className="font-bold">Kiinteistönomistajat</h6>
        <p>
          Lista kuulutuksen ilmoituksen vastaanottaneista kiinteistönomistajista muodostuu asianhallintaan, kun kuulutus hyväksytään
          julkaistavaksi.
        </p>
        <p>
          Osaa kiinteistönomistajia tiedotetaan automaattisesti Suomi.fi-palvelun kautta. Loppuja tulee tiedottaa kirjeitse. Kirjeitse
          tiedotettavat löytyvät{" "}
          <StyledLink href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid } }}>
            Tiedottaminen
          </StyledLink>{" "}
          -sivun Kiinteistönomistajien tiedotus muilla tavoin -listasta.
        </p>
      </SectionContent>
    );
  } else if (data?.suomifiViestitEnabled && vaihe === Vaihe.HYVAKSYMISPAATOS) {
    return (
      <SectionContent>
        <h6 className="font-bold">Kiinteistönomistajat ja muistuttajat</h6>
        <p>
          Lista kuulutuksen ja ilmoituksen vastaanottaneista kiinteistönomistajista ja muistuttajista muodostuu asianhallintaan, kun
          kuulutus julkaistaan hyväksyttäväksi.
        </p>
        <p>
          Osaa kiinteistönomistajia ja muistuttajia tiedotetaan automaattisesti Suomi.fi-palvelun kautta. Loppuja tulee tiedottaa kirjeitse.
          Kirjeitse tiedotettavat löytyvät{" "}
          <StyledLink href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid } }}>
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
