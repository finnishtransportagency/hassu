import * as API from "hassu-common/graphql/apiModel";
import { log } from "../logger";
import haeHyvaksymisEsityksenTiedostoTiedot, { ProjektiTiedostoineen } from "./dynamoDBCalls/getProjektiTiedostoineen";
import { NotFoundError } from "hassu-common/error";
import { nyt, parseDate } from "../util/dateUtil";
import { assertIsDefined } from "../util/assertions";
import { adaptProjektiKayttajaJulkinen } from "../projekti/adapter/adaptToAPI";
import { fileService } from "../files/fileService";
import createLadattavatTiedostot from "./lautaslinkit/createLadattavatTiedostot";
import { validateHash } from "./lautaslinkit/hash";

export default async function listaaHyvaksymisEsityksenTiedostot({
  oid,
  listaaHyvaksymisEsityksenTiedostotInput: params,
}: API.ListaaHyvaksymisEsityksenTiedostotQueryVariables): Promise<API.LadattavatTiedostot> {
  log.info("Loading projekti", { oid });
  if (!params) {
    throw new Error("params ei annettu (listaaHyvaksymisEsityksenTiedostot)");
  }
  const projekti: ProjektiTiedostoineen = await haeHyvaksymisEsityksenTiedostoTiedot(oid);
  if (projekti) {
    const hyvaksymisEsitys = projekti.julkaistuHyvaksymisEsitys;
    if (!hyvaksymisEsitys) {
      throw new NotFoundError("Hyvaksymisesitystä ei löydy");
    }
    assertIsDefined(projekti.salt, "Projektin salt on määritelty tässä vaiheessa");
    validateHash(oid, projekti.salt, params.hash);
    const poistumisPaivaEndOfTheDay = parseDate(hyvaksymisEsitys.poistumisPaiva).endOf("day");
    if (poistumisPaivaEndOfTheDay.isBefore(nyt())) {
      const projari = projekti.kayttoOikeudet.find((hlo) => (hlo.tyyppi = API.KayttajaTyyppi.PROJEKTIPAALLIKKO));
      assertIsDefined(projari, "projektilla tulee olla projektipäällikkö");
      return Promise.resolve({
        __typename: "LadattavatTiedostot",
        poistumisPaiva: hyvaksymisEsitys.poistumisPaiva,
        linkkiVanhentunut: true,
        projektipaallikonYhteystiedot: adaptProjektiKayttajaJulkinen(projari),
      });
    }
    return listaaTiedostot(projekti, params);
  } else {
    throw new NotFoundError(`Projektia ${oid} ei löydy`);
  }
}

async function listaaTiedostot(
  projekti: ProjektiTiedostoineen,
  _params: API.ListaaHyvaksymisEsityksenTiedostotInput
): Promise<API.LadattavatTiedostot> {
  const hyvaksymisEsitys = projekti.julkaistuHyvaksymisEsitys;
  if (!hyvaksymisEsitys) {
    throw new Error("Hyvaksymisesitystä ei löytynyt");
  }
  const aineistopaketti = hyvaksymisEsitys?.aineistopaketti
    ? await fileService.createYllapitoSignedDownloadLink(projekti.oid, hyvaksymisEsitys?.aineistopaketti)
    : null;
  return await createLadattavatTiedostot(projekti, hyvaksymisEsitys, aineistopaketti);
}
