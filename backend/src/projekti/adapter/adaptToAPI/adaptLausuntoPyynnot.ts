import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti, LadattuTiedosto, LausuntoPyynnonTaydennys, LausuntoPyynto } from "../../../database/model";
import { assertIsDefined } from "../../../util/assertions";
import { PathTuple, ProjektiPaths } from "../../../files/ProjektiPath";
import { adaptLadattuTiedostoToAPI } from ".";
import { jarjestaTiedostot } from "hassu-common/util/jarjestaTiedostot";
import { lausuntoPyyntoDownloadLinkService } from "../../../tiedostot/TiedostoDownloadLinkService/LausuntoPyyntoDownloadLinkService";
import { lausuntoPyynnonTaydennysDownloadLinkService } from "../../../tiedostot/TiedostoDownloadLinkService/LausuntoPyynnonTaydennysDownloadLinkService";

export function adaptLausuntoPyynnot(
  dbProjekti: DBProjekti,
  lausuntoPyynnot?: Array<LausuntoPyynto> | null
): Array<API.LausuntoPyynto> | undefined {
  const oid = dbProjekti.oid;
  return lausuntoPyynnot
    ?.filter((lp) => !lp.legacy)
    .map((lausuntoPyynto: LausuntoPyynto) => {
      const { lisaAineistot, legacy: _l, ...rest } = lausuntoPyynto;
      assertIsDefined(dbProjekti.salt);
      const paths = new ProjektiPaths(oid).lausuntoPyynto(lausuntoPyynto);
      const apiLausuntoPyynto: API.LausuntoPyynto = {
        __typename: "LausuntoPyynto",
        ...rest,
        lisaAineistot: adaptLadatutTiedostotToApi(lisaAineistot, paths),
        hash: lausuntoPyyntoDownloadLinkService.generateHash(oid, lausuntoPyynto.uuid, dbProjekti.salt),
      };
      return apiLausuntoPyynto;
    });
}

export function adaptLausuntoPyynnonTaydennykset(
  dbProjekti: DBProjekti,
  lausuntoPyynnonTaydennykset?: Array<LausuntoPyynnonTaydennys> | null
): Array<API.LausuntoPyynnonTaydennys> | undefined {
  const oid = dbProjekti.oid;
  return lausuntoPyynnonTaydennykset?.map((lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys) => {
    const { muuAineisto, muistutukset, ...rest } = lausuntoPyynnonTaydennys;
    assertIsDefined(dbProjekti.salt);
    const paths = new ProjektiPaths(oid).lausuntoPyynnonTaydennys(lausuntoPyynnonTaydennys);
    const taydennys: API.LausuntoPyynnonTaydennys = {
      __typename: "LausuntoPyynnonTaydennys",
      ...rest,
      muuAineisto: adaptLadatutTiedostotToApi(muuAineisto, paths),
      muistutukset: adaptLadatutTiedostotToApi(muistutukset, paths),
      hash: lausuntoPyynnonTaydennysDownloadLinkService.generateHash(oid, lausuntoPyynnonTaydennys.uuid, dbProjekti.salt),
    };
    return taydennys;
  });
}

function adaptLadatutTiedostotToApi(
  tiedostot: LadattuTiedosto[] | undefined,
  projektiPath: PathTuple
): Array<API.LadattuTiedosto> | undefined {
  return tiedostot
    ?.map((tiedosto) => adaptLadattuTiedostoToAPI(projektiPath, tiedosto, false) as API.LadattuTiedosto)
    .sort(jarjestaTiedostot);
}
