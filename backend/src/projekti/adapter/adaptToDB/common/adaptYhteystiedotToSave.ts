import * as API from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { StandardiYhteystiedot, Yhteystieto } from "../../../../database/model";

export const adaptYhteystiedotToSave = (yhteystietoInputs: Array<API.YhteystietoInput> | undefined | null): Yhteystieto[] | undefined =>
  yhteystietoInputs?.map((yt: API.YhteystietoInput) => {
    const ytToSave: Yhteystieto = {
      etunimi: yt.etunimi,
      sukunimi: yt.sukunimi,
      organisaatio: yt.organisaatio || undefined,
      kunta: yt.kunta || undefined,
      puhelinnumero: yt.puhelinnumero,
      sahkoposti: yt.sahkoposti,
    };
    return ytToSave;
  });

export function adaptStandardiYhteystiedotToSave(
  kuulutusYhteystiedot: API.StandardiYhteystiedotInput | null | undefined,
  tyhjaEiOk?: boolean
): StandardiYhteystiedot | undefined {
  if ((kuulutusYhteystiedot?.yhteysTiedot?.length ?? 0) + (kuulutusYhteystiedot?.yhteysHenkilot?.length ?? 0) === 0 && tyhjaEiOk) {
    throw new IllegalArgumentError("Standardiyhteystietojen on sisällettävä vähintään yksi yhteystieto!");
  }
  return {
    yhteysTiedot: adaptYhteystiedotToSave(kuulutusYhteystiedot?.yhteysTiedot),
    yhteysHenkilot: kuulutusYhteystiedot?.yhteysHenkilot || undefined,
  };
}
