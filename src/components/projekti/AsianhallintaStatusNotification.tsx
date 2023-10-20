import Notification, { NotificationType } from "@components/notification/Notification";
import { AsianTila, SuunnittelustaVastaavaViranomainen, Vaihe } from "@services/api";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import { vaiheOnMuokkausTilassa } from "common/util/haeVaiheidentiedot";
import React from "react";
import { KatsoTarkemmatASHAOhjeetLink } from "./common/KatsoTarkemmatASHAOhjeetLink";

type Props = { projekti: ProjektiLisatiedolla; vaihe: Vaihe };

const ODOTTAMATON_VIRHE_VAROITUS = "Odottamaton virhe asian tilan tarkastamisessa asianhallinnasta.";

const tilakohtainenVaroitus = (asianTila: AsianTila, isAdmin: boolean, lomakeMuokattavissa: boolean): string | undefined => {
  const additionalParagrph = lomakeMuokattavissa ? " Lue ohjeista lisää." : "";
  const vaarassaTilassaVaroitus = `Tarkasta asian tila asianhallintajärjestelmästä. Asialla on auki väärä toimenpide.${
    isAdmin ? " Asialla tulee olla oikea toimenpide auki ennen kuin kuulutuksen pystyy hyväksymään." : additionalParagrph
  }`;

  const tilojenVaroitukset: Record<AsianTila, string | undefined> = {
    ASIAA_EI_LOYDY: "Suunnitelmaa ei löydy asianhallintajärjestelmästä. Varmista, että Projektivelhoon on asetettu oikea asiatunnus.",
    ASIANHALLINTA_VAARASSA_TILASSA: vaarassaTilassaVaroitus,
    SYNKRONOITU: vaarassaTilassaVaroitus,
    EI_TESTATTAVISSA: ODOTTAMATON_VIRHE_VAROITUS,
    VIRHE: ODOTTAMATON_VIRHE_VAROITUS,
    // VALMIS VIENTIIN = EI VAROITUSTA
    VALMIS_VIENTIIN: undefined,
  };
  return tilojenVaroitukset[asianTila];
};

export default function AsianhallintaStatusNotification({ projekti, vaihe }: Props) {
  // Näytetään varoitukset vain aktiivisen vaiheen sivuilla

  const aktiivisenVaiheenSivu = projekti.asianhallinta?.aktiivinenTila?.vaihe === vaihe;
  if (
    aktiivisenVaiheenSivu &&
    !projekti.asianhallinta?.inaktiivinen &&
    //TODO Muokataan kun USPA-integraatiototeutus valmistuu
    projekti.velho.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO
  ) {
    return (
      <Notification type={NotificationType.WARN}>
        Integraatioyhteys on pois päältä. käyttäjän tulee itse viedä tiedostot asianhallintaan. <KatsoTarkemmatASHAOhjeetLink />
      </Notification>
    );
  }
  const varoitus =
    aktiivisenVaiheenSivu &&
    !projekti.asianhallinta?.inaktiivinen &&
    projekti.asianhallinta?.aktiivinenTila?.tila &&
    tilakohtainenVaroitus(
      projekti.asianhallinta.aktiivinenTila?.tila,
      projekti.nykyinenKayttaja.onProjektipaallikkoTaiVarahenkilo,
      vaiheOnMuokkausTilassa(projekti, vaihe)
    );
  return <>{varoitus && <Notification type={NotificationType.WARN}>{varoitus}</Notification>}</>;
}
