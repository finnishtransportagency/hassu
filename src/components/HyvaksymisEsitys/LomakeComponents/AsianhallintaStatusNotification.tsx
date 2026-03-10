import Notification, { NotificationType } from "@components/notification/Notification";
import { StyledLink } from "@components/StyledLink";
import { AsianhallintaNew, AsianTila, ProjektiKayttaja, SuunnittelustaVastaavaViranomainen } from "@services/api";
import { userIsAdmin, userIsProjectManagerOrSubstitute } from "common/util/userRights";
import React from "react";
import useCurrentUser from "src/hooks/useCurrentUser";

type Props = {
  asianhallinta: AsianhallintaNew;
  ashaTila: AsianTila | undefined | null;
  sivunVaiheOnAktiivinen: boolean;
  vaiheOnMuokkaustilassa: boolean;
  kayttoOikeudet: Array<ProjektiKayttaja> | undefined | null;
  suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen | undefined | null;
};

const ODOTTAMATON_VIRHE_VAROITUS = "Odottamaton virhe asian tilan tarkastamisessa asianhallinnasta.";

const KIRJAAMO_OSOITE_VAYLA = "kirjaamo@vayla.fi";

const tilakohtainenVaroitus = (
  asianTila: AsianTila | null | undefined,
  isAdmin: boolean,
  lomakeMuokattavissa: boolean,
  suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen | undefined | null
): JSX.Element | string | undefined => {
  const additionalParagrph = lomakeMuokattavissa ? " Lue ohjeista lisää." : "";
  let vaarassaTilassaVaroitus = undefined;
  if (suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO) {
    vaarassaTilassaVaroitus = `Tarkasta asian tila asianhallintajärjestelmästä. Asialla on auki väärä toimenpide.${
      isAdmin ? " Asialla tulee olla oikea toimenpide auki ennen kuin kuulutuksen pystyy hyväksymään." : additionalParagrph
    }`;
  } else {
    vaarassaTilassaVaroitus = isAdmin
      ? "Tarkasta asian tila asianhallintajärjestelmästä. Asiaa ei ole olemassa tai se on päättynyt, joten sitä ei pysty hyväksymään. Ota yhteyttä kirjaamoon."
      : "Tarkasta asian tila asianhallintajärjestelmästä. Asiaa ei ole olemassa tai se on päättynyt. Ota yhteyttä kirjaamoon.";
  }

  const tilojenVaroitukset: Record<AsianTila, JSX.Element | string | undefined> = {
    ASIAA_EI_LOYDY: "Suunnitelmaa ei löydy asianhallintajärjestelmästä. Varmista, että Projektivelhoon on asetettu oikea asiatunnus.",
    ASIANHALLINTA_VAARASSA_TILASSA: vaarassaTilassaVaroitus,
    SYNKRONOITU: vaarassaTilassaVaroitus,
    EI_TESTATTAVISSA: ODOTTAMATON_VIRHE_VAROITUS,
    VIRHE: ODOTTAMATON_VIRHE_VAROITUS,
    // VALMIS VIENTIIN = EI VAROITUSTA
    VALMIS_VIENTIIN: undefined,
    VAARA_MENETTELYTAPA: (
      <>
        Asianhallintajärjestelmässä asia on avattu väärällä menettelyllä. Ota yhteyttä kirjaamoon sähköpostilla{" "}
        <StyledLink href={`mailto:kirjaamo@vayla.fi`}>{KIRJAAMO_OSOITE_VAYLA}</StyledLink>
      </>
    ),
    VAARA_TOS_LUOKKA:
      "Suunnitelmalla on väärä tehtävä. Ota yhteyttä kirjaamoon. Tarvittaessa on avattava uusi asiatunnus tien hallinnollisen käsittelyn tehtävälle 16.01.00.",
  };
  return asianTila ? tilojenVaroitukset[asianTila] : ODOTTAMATON_VIRHE_VAROITUS;
};

export default function AsianhallintaStatusNotification({
  asianhallinta,
  ashaTila,
  sivunVaiheOnAktiivinen,
  vaiheOnMuokkaustilassa,
  kayttoOikeudet,
  suunnittelustaVastaavaViranomainen,
}: Props) {
  const { data: nykyinenKayttaja } = useCurrentUser();
  const kayttajaOnProjariTaiVarahenkilo =
    userIsAdmin(nykyinenKayttaja) || userIsProjectManagerOrSubstitute({ kayttaja: nykyinenKayttaja, projekti: { kayttoOikeudet } });

  // Näytetään varoitukset vain aktiivisen vaiheen sivuilla
  if (sivunVaiheOnAktiivinen && asianhallinta?.inaktiivinen) {
    return (
      <Notification type={NotificationType.WARN} className="mt-4">
        Integraatioyhteys on pois päältä. Käyttäjän tulee itse viedä tiedostot asianhallintaan.
      </Notification>
    );
  }

  const varoitus =
    sivunVaiheOnAktiivinen &&
    !asianhallinta?.inaktiivinen &&
    tilakohtainenVaroitus(ashaTila, kayttajaOnProjariTaiVarahenkilo, vaiheOnMuokkaustilassa, suunnittelustaVastaavaViranomainen);
  return (
    <>
      {varoitus && (
        <Notification type={NotificationType.WARN} className="mt-6">
          {varoitus}
        </Notification>
      )}
    </>
  );
}
