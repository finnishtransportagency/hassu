import { log } from "../logger";
import {
  ArkistoiProjektiMutationVariables,
  AsetaPalauteVastattuMutationVariables,
  EsikatseleAsiakirjaPDFQueryVariables,
  HaeProjektiMuutoksetVelhostaQueryVariables,
  HaeVelhoProjektiAineistoLinkkiQueryVariables,
  LaskePaattymisPaivaQueryVariables,
  LataaPalautteetPDFQueryVariables,
  LataaProjektiQueryVariables,
  LisaaMuistutusMutationVariables,
  ListaaKayttajatQueryVariables,
  ListaaPalautteetQueryVariables,
  ListaaProjektitQueryVariables,
  ListaaVelhoProjektiAineistotQueryVariables,
  ListaaVelhoProjektitQueryVariables,
  PaivitaPerustietojaMutationVariables,
  PaivitaVuorovaikutustaMutationVariables,
  ProjektinTilaQueryVariables,
  SiirraTilaMutationVariables,
  SuoritaTestiKomentoMutationVariables,
  TallennaJaSiirraTilaaMutationVariables,
  SynkronoiProjektiMuutoksetVelhostaMutationVariables,
  TallennaProjektiMutationVariables,
  EsikatseleLausuntoPyynnonTiedostotQueryVariables,
  EsikatseleLausuntoPyynnonTaydennysTiedostotQueryVariables,
  HaeKiinteistonOmistajatQueryVariables,
  TallennaKiinteistonOmistajatMutationVariables,
  TuoKarttarajausMutationVariables,
  TuoKarttarajausJaTallennaKiinteistotunnuksetMutationVariables,
  HaeMuistuttajatQueryVariables,
  TallennaMuistuttajatMutationVariables,
  LataaTiedotettavatExcelQueryVariables,
  HaeProjektinTiedottamistiedotQueryVariables,
  EsikatseleHyvaksymisEsityksenTiedostotQueryVariables,
  TallennaHyvaksymisesitysMutationVariables,
  TallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksiMutationVariables,
  PalautaHyvaksymisEsitysMutationVariables,
  HyvaksyHyvaksymisEsitysMutationVariables,
  AvaaHyvaksymisEsityksenMuokkausMutationVariables,
  SuljeHyvaksymisEsityksenMuokkausMutationVariables,
  HaeHyvaksymisEsityksenTiedotQueryVariables,
  HaeKayttoOikeudetQueryVariables,
  EsikatseleHyvaksyttavaHyvaksymisEsityksenTiedostotQueryVariables,
  TallennaEnnakkoNeuvotteluMutationVariables,
} from "hassu-common/graphql/apiModel";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { listaaVelhoProjektit } from "../handler/listaaVelhoProjektit";
import { getCurrentUser } from "../handler/getCurrentUser";
import { listUsers } from "../handler/listUsers";
import {
  arkistoiProjekti,
  createOrUpdateProjekti,
  findUpdatesFromVelho,
  haeProjektinTiedottamistiedot,
  loadProjektiYllapito,
  projektinTila,
  synchronizeUpdatesFromVelho,
  tallennaJaSiirraTilaa,
  updatePerustiedot,
  updateVuorovaikutus,
} from "../projekti/projektiHandler";
import { apiConfig, OperationName } from "hassu-common/abstractApi";
import { lataaAsiakirja } from "../handler/asiakirjaHandler";
import { calculateEndDate } from "../endDateCalculator/endDateCalculatorHandler";
import { listProjektit } from "../handler/listProjektitHandler";
import { velhoDocumentHandler } from "../handler/velhoDocumentHandler";
import { listKirjaamoOsoitteet } from "../kirjaamoOsoitteet/kirjaamoOsoitteetHandler";
import { palauteHandler } from "../palaute/palauteHandler";
import { tilaHandler } from "../handler/tila/tilaHandler";
import { muistutusHandler } from "../muistutus/muistutusHandler";
import { testHandler } from "../testing/testHandler";
import { tiedostoDownloadLinkHandler } from "../handler/tiedostoDownloadLinkHandler";
import {
  haeKiinteistonOmistajat,
  tallennaKiinteistonOmistajat,
  tuoKarttarajausJaTallennaKiinteistotunnukset,
  tuoKarttarajaus,
} from "../mml/kiinteistoHandler";
import { generateExcelByQuery } from "../mml/tiedotettavatExcel";
import {
  avaaHyvaksymisEsityksenMuokkaus,
  hyvaksyHyvaksymisEsitys,
  palautaHyvaksymisEsitys,
  suljeHyvaksymisEsityksenMuokkaus,
  tallennaHyvaksymisEsitys,
  tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi,
  esikatseleHyvaksymisEsityksenTiedostot,
  esikatseleHyvaksyttavaHyvaksymisEsityksenTiedostot,
  haeHyvaksymisEsityksenTiedot,
} from "../HyvaksymisEsitys/actions";
import haeKayttoOikeudet from "../user/haeKayttoOikeudet";
import { tallennaEnnakkoNeuvottelu } from "../ennakkoneuvottelu/tallenna";

export async function executeYllapitoOperation(event: AppSyncResolverEvent<unknown>): Promise<unknown> {
  if (!apiConfig[event.info.fieldName as OperationName].isYllapitoOperation) {
    const error = new Error("Yritettiin kutsua julkista operaatiota ylläpidon apista");
    log.error(error);
    throw error;
  }

  switch (event.info.fieldName) {
    case apiConfig.listaaProjektit.name:
      return await listProjektit((event.arguments as ListaaProjektitQueryVariables).hakuehto);
    case apiConfig.listaaVelhoProjektit.name:
      return await listaaVelhoProjektit(event.arguments as ListaaVelhoProjektitQueryVariables);
    case apiConfig.listaaVelhoProjektiAineistot.name:
      return await velhoDocumentHandler.listaaVelhoProjektiAineistot((event.arguments as ListaaVelhoProjektiAineistotQueryVariables).oid);
    case apiConfig.haeVelhoProjektiAineistoLinkki.name:
      return await velhoDocumentHandler.haeVelhoProjektiAineistoLinkki(event.arguments as HaeVelhoProjektiAineistoLinkkiQueryVariables);
    case apiConfig.haeProjektiMuutoksetVelhosta.name:
      return await findUpdatesFromVelho((event.arguments as HaeProjektiMuutoksetVelhostaQueryVariables).oid);
    case apiConfig.synkronoiProjektiMuutoksetVelhosta.name:
      return await synchronizeUpdatesFromVelho((event.arguments as SynkronoiProjektiMuutoksetVelhostaMutationVariables).oid);
    case apiConfig.nykyinenKayttaja.name:
      return await getCurrentUser();
    case apiConfig.listaaKayttajat.name:
      return await listUsers((event.arguments as ListaaKayttajatQueryVariables).hakuehto);
    case apiConfig.lataaProjekti.name:
      return await loadProjektiYllapito((event.arguments as LataaProjektiQueryVariables).oid);
    case apiConfig.projektinTila.name:
      return await projektinTila((event.arguments as ProjektinTilaQueryVariables).oid);
    case apiConfig.tallennaProjekti.name:
      return await createOrUpdateProjekti((event.arguments as TallennaProjektiMutationVariables).projekti);
    case apiConfig.tallennaJaSiirraTilaa.name:
      return await tallennaJaSiirraTilaa(event.arguments as TallennaJaSiirraTilaaMutationVariables);
    case apiConfig.tallennaHyvaksymisesitys.name:
      return await tallennaHyvaksymisEsitys((event.arguments as TallennaHyvaksymisesitysMutationVariables).input);
    case apiConfig.tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi.name:
      return await tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi(
        (event.arguments as TallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksiMutationVariables).input
      );
    case apiConfig.palautaHyvaksymisEsitys.name:
      return await palautaHyvaksymisEsitys((event.arguments as PalautaHyvaksymisEsitysMutationVariables).input);
    case apiConfig.hyvaksyHyvaksymisEsitys.name:
      return await hyvaksyHyvaksymisEsitys((event.arguments as HyvaksyHyvaksymisEsitysMutationVariables).input);
    case apiConfig.avaaHyvaksymisEsityksenMuokkaus.name:
      return await avaaHyvaksymisEsityksenMuokkaus((event.arguments as AvaaHyvaksymisEsityksenMuokkausMutationVariables).input);
    case apiConfig.suljeHyvaksymisEsityksenMuokkaus.name:
      return await suljeHyvaksymisEsityksenMuokkaus((event.arguments as SuljeHyvaksymisEsityksenMuokkausMutationVariables).input);
    case apiConfig.esikatseleAsiakirjaPDF.name:
      return await lataaAsiakirja(event.arguments as EsikatseleAsiakirjaPDFQueryVariables);
    case apiConfig.laskePaattymisPaiva.name:
      return await calculateEndDate(event.arguments as LaskePaattymisPaivaQueryVariables);
    case apiConfig.siirraTila.name:
      return await tilaHandler.siirraTila((event.arguments as SiirraTilaMutationVariables).tilasiirtyma);
    case apiConfig.paivitaVuorovaikutusta.name:
      return await updateVuorovaikutus((event.arguments as PaivitaVuorovaikutustaMutationVariables).input);
    case apiConfig.paivitaPerustietoja.name:
      return await updatePerustiedot((event.arguments as PaivitaPerustietojaMutationVariables).input);
    case apiConfig.arkistoiProjekti.name:
      return await arkistoiProjekti((event.arguments as ArkistoiProjektiMutationVariables).oid);
    case apiConfig.asetaPalauteVastattu.name:
      return await palauteHandler.asetaPalauteVastattu(event.arguments as AsetaPalauteVastattuMutationVariables);
    case apiConfig.listKirjaamoOsoitteet.name:
      return await listKirjaamoOsoitteet();
    case apiConfig.lisaaMuistutus.name:
      return await muistutusHandler.kasitteleMuistutus(event.arguments as LisaaMuistutusMutationVariables);
    case apiConfig.listaaPalautteet.name:
      return await palauteHandler.listaaPalautteet((event.arguments as ListaaPalautteetQueryVariables).oid);
    case apiConfig.lataaPalautteetPDF.name:
      return await palauteHandler.lataaPalautteetPDF((event.arguments as LataaPalautteetPDFQueryVariables).oid);
    case apiConfig.suoritaTestiKomento.name:
      await testHandler.suoritaTestiKomento((event.arguments as SuoritaTestiKomentoMutationVariables).testiKomento);
      return "";
    case apiConfig.esikatseleLausuntoPyynnonTiedostot.name:
      return await tiedostoDownloadLinkHandler.esikatseleLausuntoPyynnonTiedostot(
        event.arguments as EsikatseleLausuntoPyynnonTiedostotQueryVariables
      );
    case apiConfig.esikatseleLausuntoPyynnonTaydennysTiedostot.name:
      return await tiedostoDownloadLinkHandler.esikatseleLausuntoPyynnonTaydennysTiedostot(
        event.arguments as EsikatseleLausuntoPyynnonTaydennysTiedostotQueryVariables
      );
    case apiConfig.tuoKarttarajausJaTallennaKiinteistotunnukset.name:
      return await tuoKarttarajausJaTallennaKiinteistotunnukset(
        event.arguments as TuoKarttarajausJaTallennaKiinteistotunnuksetMutationVariables
      );
    case apiConfig.esikatseleHyvaksymisEsityksenTiedostot.name:
      return await esikatseleHyvaksymisEsityksenTiedostot(event.arguments as EsikatseleHyvaksymisEsityksenTiedostotQueryVariables);
    case apiConfig.esikatseleHyvaksyttavaHyvaksymisEsityksenTiedostot.name:
      return await esikatseleHyvaksyttavaHyvaksymisEsityksenTiedostot(
        event.arguments as EsikatseleHyvaksyttavaHyvaksymisEsityksenTiedostotQueryVariables
      );
    case apiConfig.haeHyvaksymisEsityksenTiedot.name:
      return await haeHyvaksymisEsityksenTiedot((event.arguments as HaeHyvaksymisEsityksenTiedotQueryVariables).oid);
    case apiConfig.tallennaKiinteistonOmistajat.name:
      return await tallennaKiinteistonOmistajat(event.arguments as TallennaKiinteistonOmistajatMutationVariables);
    case apiConfig.haeKiinteistonOmistajat.name:
      return await haeKiinteistonOmistajat(event.arguments as HaeKiinteistonOmistajatQueryVariables);
    case apiConfig.tuoKarttarajaus.name:
      return await tuoKarttarajaus(event.arguments as TuoKarttarajausMutationVariables);
    case apiConfig.haeMuistuttajat.name:
      return await muistutusHandler.haeMuistuttajat(event.arguments as HaeMuistuttajatQueryVariables);
    case apiConfig.tallennaMuistuttajat.name:
      return await muistutusHandler.tallennaMuistuttajat(event.arguments as TallennaMuistuttajatMutationVariables);
    case apiConfig.lataaTiedotettavatExcel.name:
      return await generateExcelByQuery(event.arguments as LataaTiedotettavatExcelQueryVariables);
    case apiConfig.haeProjektinTiedottamistiedot.name:
      return await haeProjektinTiedottamistiedot((event.arguments as HaeProjektinTiedottamistiedotQueryVariables).oid);
    case apiConfig.haeKayttoOikeudet.name:
      return await haeKayttoOikeudet((event.arguments as HaeKayttoOikeudetQueryVariables).oid);
    case apiConfig.tallennaEnnakkoNeuvottelu.name:
      return await tallennaEnnakkoNeuvottelu((event.arguments as TallennaEnnakkoNeuvotteluMutationVariables).input);
    default:
      return null;
  }
}
