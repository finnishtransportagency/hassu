import * as API from "hassu-common/graphql/apiModel";
import { jarjestaTiedostot } from "hassu-common/util/jarjestaTiedostot";
import { AineistoNew } from "../../database/model";
import { adaptFileName, joinPath } from "../../tiedostot/paths";

/**
 * Muokkaa aineistot db:ssä olevasta muodosta FE:n haluamaan muotoon, jossa on tiedossa myös tuontistatus ja polku tiedostoon
 *
 * @param {Object} parametrit
 * @param {AineistotNew[] | undefined | null} parametrit.aineistot adaptoitavat aineistot
 * @param {string | boolean | undefined | null} parametrit.aineistotHandledAt milloin projektin aineistot on viimeksi tuotu
 * @param {string} parametrit.path polku S3:ssa tämän projektin tämän aineistokokonaisuuden aineistoihin
 * @returns {API.AineistoNew[] | undefined} aineistot varustettuna tuotu-tiedolla ja täydellä polulla aineistoon
 */
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
    return [...aineistot].sort(jarjestaTiedostot).map((aineisto) => {
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
        tiedosto: tuotu ? joinPath(path, adaptFileName(aineisto.nimi)) : null,
      };

      return apiAineisto;
    });
  }
  return undefined;
}
