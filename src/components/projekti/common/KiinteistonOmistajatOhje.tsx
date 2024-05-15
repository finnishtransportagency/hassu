import StyledLink from "@components/StyledLink";
import SectionContent from "@components/layout/SectionContent";
import Notification, { NotificationType } from "@components/notification/Notification";
import { KuulutusJulkaisuTila, Status, UudelleenKuulutus, Vaihe } from "@services/api";
import { nyt } from "backend/src/util/dateUtil";
import dayjs from "dayjs";
import useSuomifiUser from "src/hooks/useSuomifiUser";

export type KiinteistonomistajatVaihe = Vaihe.NAHTAVILLAOLO | Vaihe.HYVAKSYMISPAATOS;
interface KiinteistonomistajatOhjeProps {
  vaihe?: KiinteistonomistajatVaihe;
  oid: string;
  omistajahakuStatus: Status | null | undefined;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  kuulutusPaiva?: string | null;
  julkaisunTila?: KuulutusJulkaisuTila | null;
}

function KiinteistojaEiLisatty({ oid }: Readonly<KiinteistonomistajatOhjeProps>) {
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

function KiinteistotLisatty({ oid, vaihe }: Readonly<KiinteistonomistajatOhjeProps>) {
  if (vaihe === Vaihe.NAHTAVILLAOLO) {
    return (
      <>
        <p>
          Tarkasta kiinteistönomistajien vastaanottajalista Tiedottaminen-sivun{" "}
          <StyledLink href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid } }}>
            Kiinteistönomistajat
          </StyledLink>{" "}
          -välilehdeltä. Kiinteistönomistajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään
          julkaistavaksi.
        </p>
        <p>
          Osaa kiinteistönomistajia tiedotetaan automaattisesti Suomi.fi-palvelun kautta. Loppuja tulee tiedottaa kirjeitse. Kirjeitse
          tiedotettavat löytyvät Tiedottaminen -sivun Kiinteistönomistajien tiedotus muilla tavoin -listasta.
        </p>
      </>
    );
  } else {
    return (
      <>
        <p>
          Tarkasta kiinteistönomistajien ja muistuttajien vastaanottajalista{" "}
          <StyledLink href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid } }}>
            Tiedottaminen
          </StyledLink>
          -sivulta Kiinteistönomistajat- ja Muistuttajat -välilehdiltä. Vastaanottajalista viedään automaattisesti asianhallintaan, kun
          kuulutus hyväksytään julkaistavaksi.
        </p>
        <p>
          Osaa kiinteistönomistajia ja muistuttajia tiedotetaan automaattisesti Suomi.fi-palvelun kautta. Loppuja tulee tiedottaa kirjeitse.
          Kirjeitse tiedotettavat löytyvät Tiedottaminen -sivun Kiinteistönomistajien tiedotus muilla tavoin - ja Muistuttajien tiedotus
          muilla tavoin -listoista.
        </p>
      </>
    );
  }
}

export default function KiinteistonomistajatOhje({
  vaihe,
  oid,
  omistajahakuStatus,
  uudelleenKuulutus,
}: Readonly<KiinteistonomistajatOhjeProps>) {
  const { data } = useSuomifiUser();
  if (!uudelleenKuulutus && data?.suomifiViestitEnabled && vaihe) {
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

export function KiinteistonOmistajatOhjeLukutila({
  vaihe,
  oid,
  uudelleenKuulutus,
  kuulutusPaiva,
  julkaisunTila,
}: Readonly<KiinteistonomistajatOhjeProps>) {
  const { data } = useSuomifiUser();
  const pvm = dayjs(kuulutusPaiva, "DD.MM.YYYY").startOf("date");
  const inPast = pvm.isBefore(nyt()) && julkaisunTila !== KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA;
  if (data?.suomifiViestitEnabled && vaihe === Vaihe.NAHTAVILLAOLO) {
    return (
      <SectionContent>
        <h6 className="font-bold">Kiinteistönomistajat</h6>
        {uudelleenKuulutus?.tiedotaKiinteistonomistajia === false && (
          <p>{`Kiinteistönomistajia ei ${inPast ? "tiedotettu" : "tiedoteta"} uudelleenkuulutuksen yhteydessä.`}</p>
        )}
        {(!uudelleenKuulutus || uudelleenKuulutus.tiedotaKiinteistonomistajia === true) && (
          <>
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
          </>
        )}
      </SectionContent>
    );
  } else if (data?.suomifiViestitEnabled && vaihe === Vaihe.HYVAKSYMISPAATOS) {
    return (
      <SectionContent>
        <h6 className="font-bold">Kiinteistönomistajat ja muistuttajat</h6>
        {uudelleenKuulutus?.tiedotaKiinteistonomistajia === false && (
          <p>{`Kiinteistönomistajia ja muistuttajia ei ${inPast ? "tiedotettu" : "tiedoteta"} uudelleenkuulutuksen yhteydessä.`}</p>
        )}
        {(!uudelleenKuulutus || uudelleenKuulutus.tiedotaKiinteistonomistajia === true) && (
          <>
            <p>
              Lista kuulutuksen ja ilmoituksen vastaanottaneista kiinteistönomistajista ja muistuttajista muodostuu asianhallintaan, kun
              kuulutus julkaistaan hyväksyttäväksi.
            </p>
            <p>
              Osaa kiinteistönomistajia ja muistuttajia tiedotetaan automaattisesti Suomi.fi-palvelun kautta. Loppuja tulee tiedottaa
              kirjeitse. Kirjeitse tiedotettavat löytyvät{" "}
              <StyledLink href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid } }}>
                Tiedottaminen
              </StyledLink>{" "}
              -sivun Kiinteistönomistajien tiedotus muilla tavoin - ja Muistuttajien tiedotus muilla tavoin -listoista.
            </p>
          </>
        )}
      </SectionContent>
    );
  } else {
    return <></>;
  }
}
