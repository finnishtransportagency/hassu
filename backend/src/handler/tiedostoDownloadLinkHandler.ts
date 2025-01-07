import {
  EsikatseleLausuntoPyynnonTiedostotQueryVariables,
  EsikatseleLausuntoPyynnonTaydennysTiedostotQueryVariables,
  LadattavatTiedostot,
  ListaaLausuntoPyynnonTiedostotQueryVariables,
  ListaaLausuntoPyynnonTaydennyksenTiedostotQueryVariables,
  KayttajaTyyppi,
  Status,
} from "hassu-common/graphql/apiModel";
import { projektiDatabase } from "../database/projektiDatabase";
import { log } from "../logger";
import { findLausuntoPyynnonTaydennysByUuid, findLausuntoPyyntoByUuid } from "../util/lausuntoPyyntoUtil";
import { NotFoundError } from "hassu-common/error";
import { nyt, parseDate } from "../util/dateUtil";
import { adaptProjektiKayttajaJulkinen } from "../projekti/adapter/adaptToAPI/julkinen/adaptProjektiKayttajaJulkinen";
import { assertIsDefined } from "../util/assertions";
import { lausuntoPyyntoDownloadLinkService } from "../tiedostot/TiedostoDownloadLinkService/LausuntoPyyntoDownloadLinkService";
import { lausuntoPyynnonTaydennysDownloadLinkService } from "../tiedostot/TiedostoDownloadLinkService/LausuntoPyynnonTaydennysDownloadLinkService";
import { projektiAdapterJulkinen } from "../projekti/adapter/projektiAdapterJulkinen";
import { isProjektiJulkinenStatusPublic } from "hassu-common/isProjektiJulkinenStatusPublic";

class TiedostoDownloadLinkHandler {
  async listaaLausuntoPyynnonTiedostot({
    oid,
    listaaLausuntoPyyntoTiedostotInput: params,
  }: ListaaLausuntoPyynnonTiedostotQueryVariables): Promise<LadattavatTiedostot> {
    log.info("Loading projekti", { oid });
    if (!params) {
      throw new Error("params ei annettu (listaaLausuntoPyynnonTiedostot)");
    }
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      const lausuntoPyynto = findLausuntoPyyntoByUuid(projekti, params.lausuntoPyyntoUuid);
      if (!lausuntoPyynto) {
        throw new NotFoundError("Lausuntopyyntöä ei löyty");
      }
      // projekti.salt on määritelty
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      lausuntoPyyntoDownloadLinkService.validateHash(oid, projekti.salt, params.hash, lausuntoPyynto);

      const projektijulkinen = await projektiAdapterJulkinen.adaptProjekti(projekti);
      const julkinen = !!projektijulkinen?.status && isProjektiJulkinenStatusPublic(projektijulkinen.status);

      const poistumisPaivaEndOfTheDay = parseDate(lausuntoPyynto.poistumisPaiva).endOf("day");
      if (poistumisPaivaEndOfTheDay.isBefore(nyt())) {
        const projari = projekti.kayttoOikeudet.find((hlo) => (hlo.tyyppi = KayttajaTyyppi.PROJEKTIPAALLIKKO));
        assertIsDefined(projari, "projektilla tulee olla projektipäällikkö");
        return Promise.resolve({
          __typename: "LadattavatTiedostot",
          poistumisPaiva: lausuntoPyynto.poistumisPaiva,
          linkkiVanhentunut: true,
          projektipaallikonYhteystiedot: adaptProjektiKayttajaJulkinen(projari),
          julkinen,
        });
      }
      return lausuntoPyyntoDownloadLinkService.listaaTiedostot(projekti, params);
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  }

  async listaaLausuntoPyynnonTaydennysTiedostot({
    oid,
    listaaLausuntoPyynnonTaydennyksenTiedostotInput: params,
  }: ListaaLausuntoPyynnonTaydennyksenTiedostotQueryVariables): Promise<LadattavatTiedostot> {
    log.info("Loading projekti", { oid });
    if (!params) {
      throw new Error("params ei annettu (listaaLausuntoPyynnonTaydennysTiedostot)");
    }
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      const lausuntoPyynnonTaydennys = findLausuntoPyynnonTaydennysByUuid(projekti, params.lausuntoPyynnonTaydennysUuid);
      if (!lausuntoPyynnonTaydennys) {
        throw new NotFoundError("Lausuntopyynnön täydennystä ei löydy");
      }
      // projekti.salt on määritelty
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      lausuntoPyynnonTaydennysDownloadLinkService.validateHash(oid, projekti.salt, params.hash, lausuntoPyynnonTaydennys);

      const projektijulkinen = await projektiAdapterJulkinen.adaptProjekti(projekti);
      const julkinen = !!projektijulkinen?.status && isProjektiJulkinenStatusPublic(projektijulkinen.status);
      
      const poistumisPaivaEndOfTheDay = parseDate(lausuntoPyynnonTaydennys.poistumisPaiva).endOf("day");
      if (poistumisPaivaEndOfTheDay.isBefore(nyt())) {
        const projari = projekti.kayttoOikeudet.find((hlo) => (hlo.tyyppi = KayttajaTyyppi.PROJEKTIPAALLIKKO));
        assertIsDefined(projari, "projektilla tulee olla projektipäällikkö");
        return Promise.resolve({
          __typename: "LadattavatTiedostot",
          poistumisPaiva: lausuntoPyynnonTaydennys.poistumisPaiva,
          linkkiVanhentunut: true,
          projektipaallikonYhteystiedot: adaptProjektiKayttajaJulkinen(projari),
          julkinen,
        });
      }
      return lausuntoPyynnonTaydennysDownloadLinkService.listaaTiedostot(projekti, params);
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  }

  async esikatseleLausuntoPyynnonTiedostot({
    oid,
    lausuntoPyynto,
  }: EsikatseleLausuntoPyynnonTiedostotQueryVariables): Promise<LadattavatTiedostot> {
    log.info("Loading projekti", { oid });
    if (!lausuntoPyynto) {
      throw new Error("lausuntoPyynto ei annettu (esikatseleLausuntoPyynnonTiedostot)");
    }
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      return lausuntoPyyntoDownloadLinkService.esikatseleTiedostot(projekti, lausuntoPyynto);
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  }

  async esikatseleLausuntoPyynnonTaydennysTiedostot({
    oid,
    lausuntoPyynnonTaydennys,
  }: EsikatseleLausuntoPyynnonTaydennysTiedostotQueryVariables): Promise<LadattavatTiedostot> {
    log.info("Loading projekti", { oid });
    if (!lausuntoPyynnonTaydennys) {
      throw new Error("lausuntoPyynnonTaydennys ei annettu (esikatseleLausuntoPyynnonTaydennysTiedostot)");
    }
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      return lausuntoPyynnonTaydennysDownloadLinkService.esikatseleTiedostot(projekti, lausuntoPyynnonTaydennys);
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  }
}

export const tiedostoDownloadLinkHandler = new TiedostoDownloadLinkHandler();


