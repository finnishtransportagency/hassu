import { DBProjekti } from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import { adaptLogoFilesToSave } from "./common";

export function adaptSuunnitteluSopimusToSave(
  projekti: DBProjekti,
  suunnitteluSopimusInput?: API.SuunnitteluSopimusInput | null,
  projektiAdaptationResult?: ProjektiAdaptationResult
): API.SuunnitteluSopimusInput | null | undefined {
  if (suunnitteluSopimusInput) {
    const { logo, osapuolet, ...rest } = suunnitteluSopimusInput;
    const adaptedLogo = adaptLogoFilesToSave(projekti.suunnitteluSopimus?.logo, logo, projektiAdaptationResult);
    let adaptedOsapuolet = osapuolet;
    if (osapuolet) {
      adaptedOsapuolet = osapuolet.map((osapuoli, index) => {
        if (osapuoli) {
          const { osapuolenLogo, ...osapuoliRest } = osapuoli;
          return {
            ...osapuoliRest,
            osapuolenLogo: adaptLogoFilesToSave(
              projekti.suunnitteluSopimus?.osapuolet?.[index]?.osapuolenLogo,
              osapuolenLogo,
              projektiAdaptationResult
            ),
          };
        }
        return osapuoli;
      });
    }
    return {
      ...rest,
      logo: adaptedLogo,
      osapuolet: adaptedOsapuolet,
    };
  }
  return suunnitteluSopimusInput;
}
