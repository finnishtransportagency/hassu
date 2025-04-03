import * as API from "hassu-common/graphql/apiModel";
import { NotFoundError } from "hassu-common/error";
import { log } from "../logger";
import projektiDatabase, { ProjektiTiedostoineen } from "../HyvaksymisEsitys/dynamoKutsut";
import { assertIsDefined } from "../util/assertions";
import { fileService } from "../files/fileService";
import { nyt, parseDate } from "../util/dateUtil";
import { validateEnnakkoNeuvotteluHash } from "../HyvaksymisEsitys/latauslinkit/hash";
import { adaptVelhoToProjektinPerustiedot } from "../HyvaksymisEsitys/adaptToApi/adaptVelhoToProjektinPerustiedot";
import { adaptProjektiKayttajaJulkinen } from "../projekti/adapter/adaptToAPI";
import createLadattavatTiedostot from "../HyvaksymisEsitys/latauslinkit/createLadattavatTiedostot";
import GetProjektiStatus from "../projekti/status/getProjektiStatus";

export default async function listaaEnnakkoNeuvottelunTiedostot({
  oid,
  hash,
}: API.ListaaEnnakkoNeuvottelunTiedostotQueryVariables): Promise<API.EnnakkoNeuvottelunAineistot> {
  log.info("Loading projekti", { oid });

  const projekti: ProjektiTiedostoineen = await projektiDatabase.haeEnnakkoNeuvottelunTiedostoTiedot(oid);
  if (projekti) {
    const ennakkoNeuvotteluJulkaisu = projekti.ennakkoNeuvotteluJulkaisu;
    const projari = projekti.kayttoOikeudet.find((hlo) => hlo.tyyppi === API.KayttajaTyyppi.PROJEKTIPAALLIKKO);
    assertIsDefined(projari, "projektilla tulee olla projektipäällikkö");
    assertIsDefined(projekti.velho, "Projektilla tulee olla velho");

    if (!ennakkoNeuvotteluJulkaisu) {
      return {
        __typename: "EnnakkoNeuvottelunAineistot",
        projektipaallikonYhteystiedot: adaptProjektiKayttajaJulkinen(projari),
        perustiedot: adaptVelhoToProjektinPerustiedot(projekti.velho),
      };
    }
    assertIsDefined(projekti.salt, "Projektin salt on määritelty tässä vaiheessa");
    validateEnnakkoNeuvotteluHash(oid, projekti.salt, hash);

    const poistumisPaivaEndOfTheDay = parseDate(ennakkoNeuvotteluJulkaisu.poistumisPaiva).endOf("day");

    if (poistumisPaivaEndOfTheDay.isBefore(nyt())) {
      return {
        __typename: "EnnakkoNeuvottelunAineistot",
        poistumisPaiva: ennakkoNeuvotteluJulkaisu.poistumisPaiva,
        linkkiVanhentunut: true,
        projektipaallikonYhteystiedot: adaptProjektiKayttajaJulkinen(projari),
        perustiedot: adaptVelhoToProjektinPerustiedot(projekti.velho),
      };
    }
    const aineistopaketti = projekti.ennakkoNeuvotteluAineistoPaketti
      ? await fileService.createYllapitoSignedDownloadLink(projekti.oid, projekti.ennakkoNeuvotteluAineistoPaketti)
      : null;
    const status: API.Status = await GetProjektiStatus.getProjektiStatus(projekti);
    log.info("Status: " + status);
    const ladattavatTiedostot = await createLadattavatTiedostot(projekti, ennakkoNeuvotteluJulkaisu, status);
    return {
      __typename: "EnnakkoNeuvottelunAineistot",
      ...ladattavatTiedostot,
      aineistopaketti,
      perustiedot: adaptVelhoToProjektinPerustiedot(projekti.velho),
      poistumisPaiva: ennakkoNeuvotteluJulkaisu.poistumisPaiva,
      projektipaallikonYhteystiedot: adaptProjektiKayttajaJulkinen(projari),
      lisatiedot: ennakkoNeuvotteluJulkaisu.lisatiedot,
    };
  } else {
    throw new NotFoundError(`Projektia ${oid} ei löydy`);
  }
}
