import * as API from "hassu-common/graphql/apiModel";
import { log } from "../../logger";
import haeHyvaksymisEsityksenTiedostoTiedot, { ProjektiTiedostoineen } from "../dynamoDBCalls/getProjektiTiedostoineen";
import { NotFoundError } from "hassu-common/error";
import { nyt, parseDate } from "../../util/dateUtil";
import { assertIsDefined } from "../../util/assertions";
import { adaptProjektiKayttajaJulkinen } from "../../projekti/adapter/adaptToAPI";
import { fileService } from "../../files/fileService";
import createLadattavatTiedostot from "../latauslinkit/createLadattavatTiedostot";
import { validateHyvaksymisEsitysHash } from "../latauslinkit/hash";
import { adaptLaskutustiedotToAPI } from "../adaptToApi/adaptLaskutustiedotToAPI";
import { adaptVelhoToProjektinPerustiedot } from "../adaptToApi/adaptVelhoToProjektinPerustiedot";

export default async function listaaHyvaksymisEsityksenTiedostot({
  oid,
  listaaHyvaksymisEsityksenTiedostotInput: params,
}: API.ListaaHyvaksymisEsityksenTiedostotQueryVariables): Promise<API.HyvaksymisEsityksenAineistot> {
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
    assertIsDefined(projekti.velho, "Projektilla tulee olla velho");
    validateHyvaksymisEsitysHash(oid, projekti.salt, hyvaksymisEsitys.versio, params.hash);

    const poistumisPaivaEndOfTheDay = parseDate(hyvaksymisEsitys.poistumisPaiva).endOf("day");
    const projari = projekti.kayttoOikeudet.find((hlo) => (hlo.tyyppi = API.KayttajaTyyppi.PROJEKTIPAALLIKKO));
    assertIsDefined(projari, "projektilla tulee olla projektipäällikkö");

    if (poistumisPaivaEndOfTheDay.isBefore(nyt())) {
      return {
        __typename: "HyvaksymisEsityksenAineistot",
        poistumisPaiva: hyvaksymisEsitys.poistumisPaiva,
        linkkiVanhentunut: true,
        projektipaallikonYhteystiedot: adaptProjektiKayttajaJulkinen(projari),
        perustiedot: adaptVelhoToProjektinPerustiedot(projekti.velho),
      };
    }
    const aineistopaketti = hyvaksymisEsitys?.aineistopaketti
      ? await fileService.createYllapitoSignedDownloadLink(projekti.oid, hyvaksymisEsitys?.aineistopaketti)
      : null;
    const ladattavatTiedostot = await createLadattavatTiedostot(projekti, hyvaksymisEsitys);
    return {
      __typename: "HyvaksymisEsityksenAineistot",
      ...ladattavatTiedostot,
      aineistopaketti,
      perustiedot: adaptVelhoToProjektinPerustiedot(projekti.velho),
      laskutustiedot: adaptLaskutustiedotToAPI(hyvaksymisEsitys.laskutustiedot),
      poistumisPaiva: hyvaksymisEsitys.poistumisPaiva,
      projektipaallikonYhteystiedot: adaptProjektiKayttajaJulkinen(projari),
      lisatiedot: hyvaksymisEsitys.lisatiedot,
    };
  } else {
    throw new NotFoundError(`Projektia ${oid} ei löydy`);
  }
}
