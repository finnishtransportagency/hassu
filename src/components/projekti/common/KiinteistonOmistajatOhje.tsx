import StyledLink from "@components/StyledLink";
import SectionContent from "@components/layout/SectionContent";
import Notification, { NotificationType } from "@components/notification/Notification";
import { ProjektinTiedottaminen } from "@services/api";
import { useProjektinTiedottaminen } from "src/hooks/useProjektinTiedottaminen";
import useSuomifiUser from "src/hooks/useSuomifiUser";

interface ProjektinTilaProps {
  tiedottaminen: ProjektinTiedottaminen;
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

function KiinteistotLisatty({ tiedottaminen: projektinTila }: ProjektinTilaProps) {
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
  const { data: tiedottaminen } = useProjektinTiedottaminen({ refreshInterval: 0 });
  if (data?.suomifiEnabled && tiedottaminen) {
    return (
      <SectionContent>
        <h6 className="font-bold">Kiinteistönomistajat</h6>
        {tiedottaminen.omistajahakuStatus !== null ? (
          <KiinteistotLisatty tiedottaminen={tiedottaminen} />
        ) : (
          <KiinteistojaEiLisatty tiedottaminen={tiedottaminen} />
        )}
      </SectionContent>
    );
  } else {
    return <></>;
  }
}
