import * as API from "hassu-common/graphql/apiModel";
import { jarjestaTiedostot } from "hassu-common/util/jarjestaTiedostot";
import { AineistoNew } from "../../database/model";

export function adaptAineistotToAPI({
  aineistot,
  aineistotHandledAt,
  path,
}: {
  aineistot: AineistoNew[] | undefined | null;
  aineistotHandledAt: string | boolean | undefined | null;
  path: string;
}): API.AineistoNew[] | undefined {
  if (aineistot && aineistot.length > 0) {
    return aineistot.sort(jarjestaTiedostot).map((aineisto) => {
      const { dokumenttiOid, jarjestys, kategoriaId, nimi, lisatty, uuid } = aineisto;
      const tuotu = aineistotHandledAt === true || !!(aineistotHandledAt && aineistotHandledAt.localeCompare(lisatty));
      const apiAineisto: API.AineistoNew = {
        __typename: "AineistoNew",
        dokumenttiOid,
        jarjestys,
        kategoriaId,
        nimi,
        lisatty,
        uuid,
        tuotu,
        tiedosto: tuotu ? path + aineisto.nimi : null,
      };

      return apiAineisto;
    });
  }
  return undefined;
}