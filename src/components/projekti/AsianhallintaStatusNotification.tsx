import Notification, { NotificationType } from "@components/notification/Notification";
import { StyledLink } from "@components/StyledLink";
import { AsianTila, SuunnittelustaVastaavaViranomainen, Vaihe } from "@services/api";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import { vaiheOnMuokkausTilassa } from "common/util/haeVaiheidentiedot";
import React from "react";

type Props = { projekti: ProjektiLisatiedolla; vaihe: Vaihe };

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

export default function AsianhallintaStatusNotification({ projekti, vaihe }: Props) {
  // Näytetään varoitukset vain aktiivisen vaiheen sivuilla
  const aktiivisenVaiheenSivu = projekti.asianhallinta?.aktiivinenTila?.vaihe === vaihe;
  if (aktiivisenVaiheenSivu && projekti.asianhallinta?.inaktiivinen) {
    return (
      <Notification type={NotificationType.WARN}>
        Integraatioyhteys on pois päältä. Käyttäjän tulee itse viedä tiedostot asianhallintaan.
      </Notification>
    );
  }

  const varoitus =
    aktiivisenVaiheenSivu &&
    !projekti.asianhallinta?.inaktiivinen &&
    tilakohtainenVaroitus(
      projekti.asianhallinta.aktiivinenTila?.tila,
      projekti.nykyinenKayttaja.onProjektipaallikkoTaiVarahenkilo,
      vaiheOnMuokkausTilassa(projekti, vaihe),
      projekti.velho.suunnittelustaVastaavaViranomainen
    );
  return <>{varoitus && <Notification type={NotificationType.WARN}>{varoitus}</Notification>}</>;
}
