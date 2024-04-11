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
  PoistaMuistuttajaMutationVariables,
  LataaTiedotettavatExcelQueryVariables,
  HaeProjektinTiedottamistiedotQueryVariables,
  EsikatseleHyvaksymisEsityksenTiedostotQueryVariables,
  TallennaHyvaksymisesitysMutationVariables,
  TallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksiMutationVariables,
  PalautaHyvaksymisEsitysMutationVariables,
  HyvaksyHyvaksymisEsitysMutationVariables,
  AvaaHyvaksymisEsityksenMuokkausMutationVariables,
  SuljeHyvaksymisEsityksenMuokkausMutationVariables,
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
} from "../HyvaksymisEsitys/hyvaksymisEsitysActions";

export async function executeYllapitoOperation(event: AppSyncResolverEvent<unknown>): Promise<unknown> {
  if (!apiConfig[event.info.fieldName as OperationName].isYllapitoOperation) {
    const error = new Error("Yritettiin kutsua julkista operaatiota ylläpidon apista");
    log.error(error);
    throw error;
  }
  try {
    // TODO lukitse dynamoDB
    switch (event.info.fieldName) {
      case apiConfig.listaaProjektit.name:
        return listProjektit((event.arguments as ListaaProjektitQueryVariables).hakuehto);
      case apiConfig.listaaVelhoProjektit.name:
        return listaaVelhoProjektit(event.arguments as ListaaVelhoProjektitQueryVariables);
      case apiConfig.listaaVelhoProjektiAineistot.name:
        return velhoDocumentHandler.listaaVelhoProjektiAineistot((event.arguments as ListaaVelhoProjektiAineistotQueryVariables).oid);
      case apiConfig.haeVelhoProjektiAineistoLinkki.name:
        return velhoDocumentHandler.haeVelhoProjektiAineistoLinkki(event.arguments as HaeVelhoProjektiAineistoLinkkiQueryVariables);
      case apiConfig.haeProjektiMuutoksetVelhosta.name:
        return findUpdatesFromVelho((event.arguments as HaeProjektiMuutoksetVelhostaQueryVariables).oid);
      case apiConfig.synkronoiProjektiMuutoksetVelhosta.name:
        return synchronizeUpdatesFromVelho((event.arguments as SynkronoiProjektiMuutoksetVelhostaMutationVariables).oid);
      case apiConfig.nykyinenKayttaja.name:
        return getCurrentUser();
      case apiConfig.listaaKayttajat.name:
        return listUsers((event.arguments as ListaaKayttajatQueryVariables).hakuehto);
      case apiConfig.lataaProjekti.name:
        return loadProjektiYllapito((event.arguments as LataaProjektiQueryVariables).oid);
      case apiConfig.projektinTila.name:
        return projektinTila((event.arguments as ProjektinTilaQueryVariables).oid);
      case apiConfig.tallennaProjekti.name:
        return createOrUpdateProjekti((event.arguments as TallennaProjektiMutationVariables).projekti);
      case apiConfig.tallennaJaSiirraTilaa.name:
        return tallennaJaSiirraTilaa(event.arguments as TallennaJaSiirraTilaaMutationVariables);
      case apiConfig.tallennaHyvaksymisesitys.name:
        return tallennaHyvaksymisEsitys((event.arguments as TallennaHyvaksymisesitysMutationVariables).input);
      case apiConfig.tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi.name:
        return tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi(
          (event.arguments as TallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksiMutationVariables).input
        );
      case apiConfig.palautaHyvaksymisEsitys.name:
        return palautaHyvaksymisEsitys((event.arguments as PalautaHyvaksymisEsitysMutationVariables).input);
      case apiConfig.hyvaksyHyvaksymisEsitys.name:
        return hyvaksyHyvaksymisEsitys((event.arguments as HyvaksyHyvaksymisEsitysMutationVariables).input);
      case apiConfig.avaaHyvaksymisEsityksenMuokkaus.name:
        return avaaHyvaksymisEsityksenMuokkaus((event.arguments as AvaaHyvaksymisEsityksenMuokkausMutationVariables).input);
      case apiConfig.suljeHyvaksymisEsityksenMuokkaus.name:
        return suljeHyvaksymisEsityksenMuokkaus((event.arguments as SuljeHyvaksymisEsityksenMuokkausMutationVariables).input);
      case apiConfig.esikatseleAsiakirjaPDF.name:
        return lataaAsiakirja(event.arguments as EsikatseleAsiakirjaPDFQueryVariables);
      case apiConfig.laskePaattymisPaiva.name:
        return calculateEndDate(event.arguments as LaskePaattymisPaivaQueryVariables);
      case apiConfig.siirraTila.name:
        return tilaHandler.siirraTila((event.arguments as SiirraTilaMutationVariables).tilasiirtyma);
      case apiConfig.paivitaVuorovaikutusta.name:
        return updateVuorovaikutus((event.arguments as PaivitaVuorovaikutustaMutationVariables).input);
      case apiConfig.paivitaPerustietoja.name:
        return updatePerustiedot((event.arguments as PaivitaPerustietojaMutationVariables).input);
      case apiConfig.arkistoiProjekti.name:
        return arkistoiProjekti((event.arguments as ArkistoiProjektiMutationVariables).oid);
      case apiConfig.asetaPalauteVastattu.name:
        return palauteHandler.asetaPalauteVastattu(event.arguments as AsetaPalauteVastattuMutationVariables);
      case apiConfig.listKirjaamoOsoitteet.name:
        return listKirjaamoOsoitteet();
      case apiConfig.lisaaMuistutus.name:
        return muistutusHandler.kasitteleMuistutus(event.arguments as LisaaMuistutusMutationVariables);
      case apiConfig.listaaPalautteet.name:
        return palauteHandler.listaaPalautteet((event.arguments as ListaaPalautteetQueryVariables).oid);
      case apiConfig.lataaPalautteetPDF.name:
        return palauteHandler.lataaPalautteetPDF((event.arguments as LataaPalautteetPDFQueryVariables).oid);
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
      case apiConfig.poistaMuistuttaja.name:
        return await muistutusHandler.poistaMuistuttaja(event.arguments as PoistaMuistuttajaMutationVariables);
      case apiConfig.lataaTiedotettavatExcel.name:
        return await generateExcelByQuery(event.arguments as LataaTiedotettavatExcelQueryVariables);
      case apiConfig.haeProjektinTiedottamistiedot.name:
        return await haeProjektinTiedottamistiedot((event.arguments as HaeProjektinTiedottamistiedotQueryVariables).oid);
      default:
        return null;
    }
  } finally {
    // TODO: poista lukitus
  }
}
