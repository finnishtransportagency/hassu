import { MuistutusInput } from "hassu-common/graphql/apiModel";
import { Muistutus } from "../database/model";
import { SuomiFiCognitoKayttaja } from "../user/suomiFiCognitoKayttaja";

type AdaptMuistutusInputOptions = {
  aikaleima: string;
  muistutusId: string;
  liitteet: string[] | null | undefined;
  loggedInUser: SuomiFiCognitoKayttaja | undefined;
  muistutusInput: MuistutusInput;
};

export function adaptMuistutusInput({
  aikaleima,
  muistutusId,
  liitteet,
  loggedInUser,
  muistutusInput,
}: AdaptMuistutusInputOptions): Muistutus {
  // Set country code as undefined when it is the country code of Finland
  // We don't want it to be visible anywhere
  const maakoodi = muistutusInput.maa !== "FI" ? muistutusInput.maa : undefined;
  return {
    vastaanotettu: aikaleima,
    id: muistutusId,
    liitteet,
    etunimi: loggedInUser?.given_name ?? muistutusInput.etunimi,
    sukunimi: loggedInUser?.family_name ?? muistutusInput.sukunimi,
    maakoodi,
    katuosoite: muistutusInput.katuosoite,
    muistutus: muistutusInput.muistutus,
    postinumero: muistutusInput.postinumero,
    postitoimipaikka: muistutusInput.postitoimipaikka,
    sahkoposti: muistutusInput.sahkoposti,
    puhelinnumero: muistutusInput.puhelinnumero,
  };
}
