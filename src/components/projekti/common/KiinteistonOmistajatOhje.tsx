import StyledLink from "@components/StyledLink";
import SectionContent from "@components/layout/SectionContent";
import Notification, { NotificationType } from "@components/notification/Notification";
import { ProjektinTila } from "@services/api";
import { useProjektinTila } from "src/hooks/useProjektinTila";
import useSuomifiUser from "src/hooks/useSuomifiUser";

interface ProjektinTilaProps {
  projektinTila: ProjektinTila;
}

function KiinteistojaEiLisatty({ projektinTila }: ProjektinTilaProps) {
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

function KiinteistotLisatty({ projektinTila }: ProjektinTilaProps) {
  return (
    <p>
      Tarkasta kiinteistönomistajien vastaanottajalista Tiedottaminen-sivun{" "}
      <StyledLink href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid: projektinTila?.oid } }}>
        Kiinteistönomistajat
      </StyledLink>{" "}
      -välilehdeltä. Kiinteistönomistajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään
      julkaistavaksi.
    </p>
  );
}

export default function KiinteistonomistajatOhje() {
  const { data } = useSuomifiUser();
  const { data: projektinTila } = useProjektinTila({ refreshInterval: 0 });
  if (data?.suomifiEnabled && projektinTila) {
    return (
      <SectionContent>
        <h6 className="font-bold">Kiinteistönomistajat</h6>
        {projektinTila.omistajahakuStatus !== null ? (
          <KiinteistotLisatty projektinTila={projektinTila} />
        ) : (
          <KiinteistojaEiLisatty projektinTila={projektinTila} />
        )}
      </SectionContent>
    );
  } else {
    return <></>;
  }
}
