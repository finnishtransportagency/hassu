import {
  AnnaPalautettaPalvelustaMutationVariables,
  ArkistoiProjektiMutationVariables,
  AsetaPalauteVastattuMutationVariables,
  AsiakirjaTyyppi,
  EsikatseleAsiakirjaPDFQueryVariables,
  EsikatseleLausuntoPyynnonTiedostotQueryVariables,
  EsikatseleLausuntoPyynnonTaydennysTiedostotQueryVariables,
  HaeProjektiMuutoksetVelhostaQueryVariables,
  HaeVelhoProjektiAineistoLinkkiQueryVariables,
  Kayttaja,
  Kieli,
  KirjaamoOsoite,
  LadattavatTiedostot,
  LaskePaattymisPaivaQueryVariables,
  LaskuriTyyppi,
  LataaPalautteetPDFQueryVariables,
  LataaProjektiJulkinenQueryVariables,
  LataaProjektiQueryVariables,
  LatausTiedot,
  LausuntoPyynnonTaydennysInput,
  LausuntoPyyntoInput,
  LisaaMuistutusMutationVariables,
  LisaaPalauteMutationVariables,
  ListaaKayttajatInput,
  ListaaKayttajatQueryVariables,
  ListaaLausuntoPyynnonTiedostotQueryVariables,
  ListaaLausuntoPyynnonTaydennyksenTiedostotInput,
  ListaaLausuntoPyynnonTaydennyksenTiedostotQueryVariables,
  ListaaLausuntoPyyntoTiedostotInput,
  ListaaLisaAineistoInput,
  ListaaLisaAineistoQueryVariables,
  ListaaPalautteetQueryVariables,
  ListaaProjektitInput,
  ListaaProjektitQueryVariables,
  ListaaVelhoProjektiAineistotQueryVariables,
  ListaaVelhoProjektitQueryVariables,
  MuistutusInput,
  NykyinenKayttaja,
  PaivitaPerustietojaMutationVariables,
  PaivitaVuorovaikutustaMutationVariables,
  Palaute,
  PalauteInput,
  PalveluPalauteInput,
  PDF,
  Projekti,
  ProjektiHakutulos,
  ProjektiHakutulosJulkinen,
  ProjektiJulkinen,
  ProjektinTila,
  ProjektinTilaQueryVariables,
  SiirraTilaMutationVariables,
  SuomifiKayttaja,
  SuoritaTestiKomentoMutationVariables,
  SynkronoiProjektiMuutoksetVelhostaMutationVariables,
  TallennaJaSiirraTilaaMutationVariables,
  TallennaProjektiInput,
  TallennaProjektiMutationVariables,
  TestiKomentoInput,
  TilaSiirtymaInput,
  ValmisteleTiedostonLatausQueryVariables,
  Velho,
  VelhoHakuTulos,
  VelhoToimeksianto,
  VuorovaikutusPaivitysInput,
  VuorovaikutusPerustiedotInput,
  TuoKarttarajausJaTallennaKiinteistotunnuksetMutationVariables,
  HaeKiinteistonOmistajatQueryVariables,
  TuoKarttarajausMutationVariables,
  HaeMuistuttajatQueryVariables,
  KiinteistonOmistajat,
  Muistuttajat,
  Excel,
  LataaTiedotettavatExcelQueryVariables,
  HaeProjektinTiedottamistiedotQueryVariables,
  ProjektinTiedottaminen,
  Status,
  TallennaKiinteistonOmistajatMutationVariables,
  ListaaHyvaksymisEsityksenTiedostotInput,
  EsikatseleHyvaksymisEsityksenTiedostotQueryVariables,
  TallennaHyvaksymisEsitysInput,
  TallennaHyvaksymisesitysMutationVariables,
  TallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksiMutationVariables,
  PalautaHyvaksymisEsitysMutationVariables,
  PalautaInput,
  TilaMuutosInput,
  HyvaksyHyvaksymisEsitysMutationVariables,
  AvaaHyvaksymisEsityksenMuokkausMutationVariables,
  SuljeHyvaksymisEsityksenMuokkausMutationVariables,
  HyvaksymisEsityksenTiedot,
  HaeHyvaksymisEsityksenTiedotQueryVariables,
  HyvaksymisEsitysInput,
  ListaaHyvaksymisEsityksenTiedostotQueryVariables,
  TallennaMuistuttajatMutationVariables,
  HaeKayttoOikeudetQueryVariables,
  KayttoOikeusTiedot,
  HyvaksymisEsityksenAineistot,
} from "./graphql/apiModel";
import * as queries from "./graphql/queries";
import * as mutations from "./graphql/mutations";
import log from "loglevel";
import { IncomingHttpHeaders } from "http";

export enum OperationType {
  Mutation,
  Query,
}

export type OperationName = keyof typeof queries | keyof typeof mutations;

export type OperationConfig = {
  name: OperationName;
  operationType: OperationType;
  graphql: string;
  isYllapitoOperation?: boolean;
};

export type ApiConfig = { [operationName in OperationName]: OperationConfig };

export const apiConfig: ApiConfig = {
  tallennaProjekti: {
    name: "tallennaProjekti",
    operationType: OperationType.Mutation,
    graphql: mutations.tallennaProjekti,
    isYllapitoOperation: true,
  },
  tallennaJaSiirraTilaa: {
    name: "tallennaJaSiirraTilaa",
    operationType: OperationType.Mutation,
    graphql: mutations.tallennaJaSiirraTilaa,
    isYllapitoOperation: true,
  },
  tallennaHyvaksymisesitys: {
    name: "tallennaHyvaksymisesitys",
    operationType: OperationType.Mutation,
    graphql: mutations.tallennaHyvaksymisesitys,
    isYllapitoOperation: true,
  },
  tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi: {
    name: "tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi",
    operationType: OperationType.Mutation,
    graphql: mutations.tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi,
    isYllapitoOperation: true,
  },
  palautaHyvaksymisEsitys: {
    name: "palautaHyvaksymisEsitys",
    operationType: OperationType.Mutation,
    graphql: mutations.palautaHyvaksymisEsitys,
    isYllapitoOperation: true,
  },
  hyvaksyHyvaksymisEsitys: {
    name: "hyvaksyHyvaksymisEsitys",
    operationType: OperationType.Mutation,
    graphql: mutations.hyvaksyHyvaksymisEsitys,
    isYllapitoOperation: true,
  },
  avaaHyvaksymisEsityksenMuokkaus: {
    name: "avaaHyvaksymisEsityksenMuokkaus",
    operationType: OperationType.Mutation,
    graphql: mutations.avaaHyvaksymisEsityksenMuokkaus,
    isYllapitoOperation: true,
  },
  suljeHyvaksymisEsityksenMuokkaus: {
    name: "suljeHyvaksymisEsityksenMuokkaus",
    operationType: OperationType.Mutation,
    graphql: mutations.suljeHyvaksymisEsityksenMuokkaus,
    isYllapitoOperation: true,
  },
  lataaProjekti: {
    name: "lataaProjekti",
    operationType: OperationType.Query,
    graphql: queries.lataaProjekti,
    isYllapitoOperation: true,
  },
  lataaProjektiJulkinen: {
    name: "lataaProjektiJulkinen",
    operationType: OperationType.Query,
    graphql: queries.lataaProjektiJulkinen,
  },
  projektinTila: {
    name: "projektinTila",
    operationType: OperationType.Query,
    graphql: queries.projektinTila,
    isYllapitoOperation: true,
  },
  listaaProjektit: {
    name: "listaaProjektit",
    operationType: OperationType.Query,
    graphql: queries.listaaProjektit,
    isYllapitoOperation: true,
  },
  listaaProjektitJulkinen: {
    name: "listaaProjektitJulkinen",
    operationType: OperationType.Query,
    graphql: queries.listaaProjektitJulkinen,
  },
  listaaVelhoProjektit: {
    name: "listaaVelhoProjektit",
    operationType: OperationType.Query,
    graphql: queries.listaaVelhoProjektit,
    isYllapitoOperation: true,
  },
  nykyinenKayttaja: {
    name: "nykyinenKayttaja",
    operationType: OperationType.Query,
    graphql: queries.nykyinenKayttaja,
    isYllapitoOperation: true,
  },
  nykyinenSuomifiKayttaja: {
    name: "nykyinenSuomifiKayttaja",
    operationType: OperationType.Query,
    graphql: queries.nykyinenSuomifiKayttaja,
    isYllapitoOperation: false,
  },
  listaaKayttajat: {
    name: "listaaKayttajat",
    operationType: OperationType.Query,
    graphql: queries.listaaKayttajat,
    isYllapitoOperation: true,
  },
  esikatseleAsiakirjaPDF: {
    name: "esikatseleAsiakirjaPDF",
    operationType: OperationType.Query,
    graphql: queries.esikatseleAsiakirjaPDF,
    isYllapitoOperation: true,
  },
  valmisteleTiedostonLataus: {
    name: "valmisteleTiedostonLataus",
    operationType: OperationType.Query,
    graphql: queries.valmisteleTiedostonLataus,
  },
  tuoKarttarajaus: {
    name: "tuoKarttarajaus",
    operationType: OperationType.Mutation,
    graphql: mutations.tuoKarttarajaus,
    isYllapitoOperation: true,
  },
  laskePaattymisPaiva: {
    name: "laskePaattymisPaiva",
    operationType: OperationType.Query,
    graphql: queries.laskePaattymisPaiva,
    isYllapitoOperation: true,
  },
  siirraTila: {
    name: "siirraTila",
    operationType: OperationType.Mutation,
    graphql: mutations.siirraTila,
    isYllapitoOperation: true,
  },
  paivitaVuorovaikutusta: {
    name: "paivitaVuorovaikutusta",
    operationType: OperationType.Mutation,
    graphql: mutations.paivitaVuorovaikutusta,
    isYllapitoOperation: true,
  },
  paivitaPerustietoja: {
    name: "paivitaPerustietoja",
    operationType: OperationType.Mutation,
    graphql: mutations.paivitaPerustietoja,
    isYllapitoOperation: true,
  },
  arkistoiProjekti: {
    name: "arkistoiProjekti",
    operationType: OperationType.Mutation,
    graphql: mutations.arkistoiProjekti,
    isYllapitoOperation: true,
  },
  listaaVelhoProjektiAineistot: {
    name: "listaaVelhoProjektiAineistot",
    operationType: OperationType.Query,
    graphql: queries.listaaVelhoProjektiAineistot,
    isYllapitoOperation: true,
  },
  haeVelhoProjektiAineistoLinkki: {
    name: "haeVelhoProjektiAineistoLinkki",
    operationType: OperationType.Query,
    graphql: queries.haeVelhoProjektiAineistoLinkki,
    isYllapitoOperation: true,
  },
  lisaaPalaute: {
    name: "lisaaPalaute",
    operationType: OperationType.Mutation,
    graphql: mutations.lisaaPalaute,
  },
  listaaPalautteet: {
    name: "listaaPalautteet",
    operationType: OperationType.Query,
    graphql: queries.listaaPalautteet,
    isYllapitoOperation: true,
  },
  lataaPalautteetPDF: {
    name: "lataaPalautteetPDF",
    operationType: OperationType.Query,
    graphql: queries.lataaPalautteetPDF,
    isYllapitoOperation: true,
  },
  asetaPalauteVastattu: {
    name: "asetaPalauteVastattu",
    operationType: OperationType.Mutation,
    graphql: mutations.asetaPalauteVastattu,
    isYllapitoOperation: true,
  },
  haeProjektiMuutoksetVelhosta: {
    name: "haeProjektiMuutoksetVelhosta",
    operationType: OperationType.Query,
    graphql: queries.haeProjektiMuutoksetVelhosta,
    isYllapitoOperation: true,
  },
  synkronoiProjektiMuutoksetVelhosta: {
    name: "synkronoiProjektiMuutoksetVelhosta",
    operationType: OperationType.Mutation,
    graphql: mutations.synkronoiProjektiMuutoksetVelhosta,
    isYllapitoOperation: true,
  },
  listKirjaamoOsoitteet: {
    name: "listKirjaamoOsoitteet",
    operationType: OperationType.Query,
    graphql: queries.listKirjaamoOsoitteet,
    isYllapitoOperation: true,
  },
  lisaaMuistutus: {
    name: "lisaaMuistutus",
    operationType: OperationType.Mutation,
    graphql: mutations.lisaaMuistutus,
  },
  listaaLisaAineisto: {
    name: "listaaLisaAineisto",
    operationType: OperationType.Query,
    graphql: queries.listaaLisaAineisto,
  },
  listaaLausuntoPyynnonTiedostot: {
    name: "listaaLausuntoPyynnonTiedostot",
    operationType: OperationType.Query,
    graphql: queries.listaaLausuntoPyynnonTiedostot,
  },
  listaaLausuntoPyynnonTaydennyksenTiedostot: {
    name: "listaaLausuntoPyynnonTaydennyksenTiedostot",
    operationType: OperationType.Query,
    graphql: queries.listaaLausuntoPyynnonTaydennyksenTiedostot,
  },
  listaaHyvaksymisEsityksenTiedostot: {
    name: "listaaHyvaksymisEsityksenTiedostot",
    operationType: OperationType.Query,
    graphql: queries.listaaHyvaksymisEsityksenTiedostot,
  },
  esikatseleLausuntoPyynnonTiedostot: {
    name: "esikatseleLausuntoPyynnonTiedostot",
    operationType: OperationType.Query,
    graphql: queries.esikatseleLausuntoPyynnonTiedostot,
    isYllapitoOperation: true,
  },
  esikatseleLausuntoPyynnonTaydennysTiedostot: {
    name: "esikatseleLausuntoPyynnonTaydennysTiedostot",
    operationType: OperationType.Query,
    graphql: queries.esikatseleLausuntoPyynnonTaydennysTiedostot,
    isYllapitoOperation: true,
  },
  esikatseleHyvaksymisEsityksenTiedostot: {
    name: "esikatseleHyvaksymisEsityksenTiedostot",
    operationType: OperationType.Query,
    graphql: queries.esikatseleHyvaksymisEsityksenTiedostot,
    isYllapitoOperation: true,
  },
  haeHyvaksymisEsityksenTiedot: {
    name: "haeHyvaksymisEsityksenTiedot",
    operationType: OperationType.Query,
    graphql: queries.haeHyvaksymisEsityksenTiedot,
    isYllapitoOperation: true,
  },
  annaPalautettaPalvelusta: {
    name: "annaPalautettaPalvelusta",
    operationType: OperationType.Mutation,
    graphql: mutations.annaPalautettaPalvelusta,
  },
  suoritaTestiKomento: {
    name: "suoritaTestiKomento",
    operationType: OperationType.Mutation,
    graphql: mutations.suoritaTestiKomento,
    isYllapitoOperation: true,
  },
  tuoKarttarajausJaTallennaKiinteistotunnukset: {
    name: "tuoKarttarajausJaTallennaKiinteistotunnukset",
    operationType: OperationType.Mutation,
    graphql: mutations.tuoKarttarajausJaTallennaKiinteistotunnukset,
    isYllapitoOperation: true,
  },
  haeKiinteistonOmistajat: {
    name: "haeKiinteistonOmistajat",
    operationType: OperationType.Query,
    graphql: queries.haeKiinteistonOmistajat,
    isYllapitoOperation: true,
  },
  tallennaKiinteistonOmistajat: {
    name: "tallennaKiinteistonOmistajat",
    operationType: OperationType.Mutation,
    graphql: mutations.tallennaKiinteistonOmistajat,
    isYllapitoOperation: true,
  },
  haeMuistuttajat: {
    name: "haeMuistuttajat",
    operationType: OperationType.Query,
    graphql: queries.haeMuistuttajat,
    isYllapitoOperation: true,
  },
  tallennaMuistuttajat: {
    name: "tallennaMuistuttajat",
    operationType: OperationType.Mutation,
    graphql: mutations.tallennaMuistuttajat,
    isYllapitoOperation: true,
  },
  lataaTiedotettavatExcel: {
    name: "lataaTiedotettavatExcel",
    operationType: OperationType.Query,
    graphql: queries.lataaTiedotettavatExcel,
    isYllapitoOperation: true,
  },
  haeProjektinTiedottamistiedot: {
    name: "haeProjektinTiedottamistiedot",
    operationType: OperationType.Query,
    graphql: queries.haeProjektinTiedottamistiedot,
    isYllapitoOperation: true,
  },
  haeKayttoOikeudet: {
    name: "haeKayttoOikeudet",
    operationType: OperationType.Query,
    graphql: queries.haeKayttoOikeudet,
    isYllapitoOperation: true,
  },
};

export abstract class AbstractApi {
  oneTimeHeaders: IncomingHttpHeaders | undefined;

  async lataaProjekti(oid: string): Promise<Projekti> {
    return await this.callYllapitoAPI(apiConfig.lataaProjekti, {
      oid,
    } as LataaProjektiQueryVariables);
  }

  async lataaProjektinTila(oid: string): Promise<ProjektinTila> {
    return await this.callYllapitoAPI(apiConfig.projektinTila, {
      oid,
    } as ProjektinTilaQueryVariables);
  }

  async lataaProjektiJulkinen(oid: string, kieli?: Kieli): Promise<ProjektiJulkinen> {
    const params: LataaProjektiJulkinenQueryVariables = {
      oid,
      kieli,
    };
    return await this.callAPI(apiConfig.lataaProjektiJulkinen, params);
  }

  async tallennaProjekti(input: TallennaProjektiInput): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.tallennaProjekti, {
      projekti: input,
    } as TallennaProjektiMutationVariables);
  }

  async tallennaJaSiirraTilaa(projekti: TallennaProjektiInput, tilasiirtyma: TilaSiirtymaInput): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.tallennaJaSiirraTilaa, {
      projekti,
      tilasiirtyma,
    } as TallennaJaSiirraTilaaMutationVariables);
  }

  async tallennaHyvaksymisEsitys(input: TallennaHyvaksymisEsitysInput): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.tallennaHyvaksymisesitys, {
      input,
    } as TallennaHyvaksymisesitysMutationVariables);
  }

  async tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi(input: TallennaHyvaksymisEsitysInput): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi, {
      input,
    } as TallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksiMutationVariables);
  }

  async palautaHyvaksymisEsitys(input: PalautaInput): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.palautaHyvaksymisEsitys, {
      input,
    } as PalautaHyvaksymisEsitysMutationVariables);
  }

  async hyvaksyHyvaksymisEsitys(input: TilaMuutosInput): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.hyvaksyHyvaksymisEsitys, {
      input,
    } as HyvaksyHyvaksymisEsitysMutationVariables);
  }

  async avaaHyvaksymisEsityksenMuokkaus(input: TilaMuutosInput): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.avaaHyvaksymisEsityksenMuokkaus, {
      input,
    } as AvaaHyvaksymisEsityksenMuokkausMutationVariables);
  }

  async suljeHyvaksymisEsityksenMuokkaus(input: TilaMuutosInput): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.suljeHyvaksymisEsityksenMuokkaus, {
      input,
    } as SuljeHyvaksymisEsityksenMuokkausMutationVariables);
  }

  async haeHyvaksymisEsityksenTiedot(oid: string): Promise<HyvaksymisEsityksenTiedot> {
    return await this.callYllapitoAPI(apiConfig.haeHyvaksymisEsityksenTiedot, {
      oid,
    } as HaeHyvaksymisEsityksenTiedotQueryVariables);
  }

  async arkistoiProjekti(oid: string): Promise<Projekti> {
    return await this.callYllapitoAPI(apiConfig.arkistoiProjekti, {
      oid,
    } as ArkistoiProjektiMutationVariables);
  }

  async getVelhoSuunnitelmasByName(nimi: string, requireExactMatch?: boolean): Promise<VelhoHakuTulos[]> {
    return await this.callYllapitoAPI(apiConfig.listaaVelhoProjektit, {
      nimi,
      requireExactMatch,
    } as ListaaVelhoProjektitQueryVariables);
  }

  async listaaVelhoProjektiAineistot(oid: string): Promise<VelhoToimeksianto[]> {
    return await this.callYllapitoAPI(apiConfig.listaaVelhoProjektiAineistot, {
      oid,
    } as ListaaVelhoProjektiAineistotQueryVariables);
  }

  async haeVelhoProjektiAineistoLinkki(oid: string, dokumenttiOid: string): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.haeVelhoProjektiAineistoLinkki, {
      oid,
      dokumenttiOid,
    } as HaeVelhoProjektiAineistoLinkkiQueryVariables);
  }

  async valmisteleTiedostonLataus(tiedostoNimi: string, contentType: string): Promise<LatausTiedot> {
    const variables: ValmisteleTiedostonLatausQueryVariables = {
      tiedostoNimi,
      contentType,
    };
    return await this.callAPI(apiConfig.valmisteleTiedostonLataus, variables);
  }

  async tuoKarttarajaus(oid: string, geoJSON: string): Promise<string> {
    const variables: TuoKarttarajausMutationVariables = {
      oid,
      geoJSON,
    };
    return await this.callYllapitoAPI(apiConfig.tuoKarttarajaus, variables);
  }

  async annaPalvelustaPalautetta(palveluPalauteInput: PalveluPalauteInput): Promise<string> {
    return await this.callAPI(apiConfig.annaPalautettaPalvelusta, { palveluPalauteInput } as AnnaPalautettaPalvelustaMutationVariables);
  }

  async listProjektit(hakuehto: ListaaProjektitInput): Promise<ProjektiHakutulos> {
    return await this.callYllapitoAPI(apiConfig.listaaProjektit, { hakuehto } as ListaaProjektitQueryVariables);
  }

  async listProjektitJulkinen(hakuehto: ListaaProjektitInput): Promise<ProjektiHakutulosJulkinen> {
    return await this.callAPI(apiConfig.listaaProjektitJulkinen, { hakuehto } as ListaaProjektitQueryVariables);
  }

  async getCurrentUser(): Promise<NykyinenKayttaja | undefined> {
    try {
      return await this.callYllapitoAPI(apiConfig.nykyinenKayttaja);
    } catch (e) {
      log.error(e);
    }
  }

  async getCurrentSuomifiUser(): Promise<SuomifiKayttaja | undefined> {
    try {
      return await this.callAPI(apiConfig.nykyinenSuomifiKayttaja);
    } catch (e) {
      log.error(e);
    }
  }

  async listUsers(input: ListaaKayttajatInput): Promise<Kayttaja[]> {
    return await this.callYllapitoAPI(apiConfig.listaaKayttajat, { hakuehto: input } as ListaaKayttajatQueryVariables);
  }

  async esikatseleAsiakirjaPDF(
    oid: string,
    asiakirjaTyyppi: AsiakirjaTyyppi,
    kieli: Kieli,
    muutokset: TallennaProjektiInput
  ): Promise<PDF> {
    return await this.callYllapitoAPI(apiConfig.esikatseleAsiakirjaPDF, {
      oid,
      asiakirjaTyyppi,
      kieli,
      muutokset,
    } as EsikatseleAsiakirjaPDFQueryVariables);
  }

  async laskePaattymisPaiva(alkupaiva: string, tyyppi: LaskuriTyyppi): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.laskePaattymisPaiva, {
      alkupaiva,
      tyyppi,
    } as LaskePaattymisPaivaQueryVariables);
  }

  async siirraTila(tilasiirtyma: TilaSiirtymaInput): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.siirraTila, {
      tilasiirtyma,
    } as SiirraTilaMutationVariables);
  }

  async paivitaVuorovaikutusta(input: VuorovaikutusPaivitysInput): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.paivitaVuorovaikutusta, {
      input,
    } as PaivitaVuorovaikutustaMutationVariables);
  }

  async paivitaPerustiedot(input: VuorovaikutusPerustiedotInput): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.paivitaPerustietoja, {
      input,
    } as PaivitaPerustietojaMutationVariables);
  }

  async lisaaPalaute(oid: string, palaute: PalauteInput): Promise<string> {
    return await this.callAPI(apiConfig.lisaaPalaute, {
      oid,
      palaute,
    } as LisaaPalauteMutationVariables);
  }

  async listaaPalautteet(oid: string): Promise<Palaute[]> {
    const variables: ListaaPalautteetQueryVariables = {
      oid,
    };
    return await this.callYllapitoAPI(apiConfig.listaaPalautteet, variables);
  }

  async lataaPalautteetPDF(oid: string): Promise<PDF> {
    const variables: LataaPalautteetPDFQueryVariables = {
      oid,
    };
    return await this.callYllapitoAPI(apiConfig.lataaPalautteetPDF, variables);
  }

  async lisaaMuistutus(oid: string, muistutus: MuistutusInput): Promise<string> {
    return await this.callAPI(apiConfig.lisaaMuistutus, {
      oid,
      muistutus,
    } as LisaaMuistutusMutationVariables);
  }

  async asetaPalauteVastattu(oid: string, id: string, vastattu: boolean): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.asetaPalauteVastattu, {
      oid,
      id,
      vastattu,
    } as AsetaPalauteVastattuMutationVariables);
  }

  async haeProjektiMuutoksetVelhosta(oid: string): Promise<Velho> {
    return await this.callYllapitoAPI(apiConfig.haeProjektiMuutoksetVelhosta, {
      oid,
    } as HaeProjektiMuutoksetVelhostaQueryVariables);
  }

  async synkronoiProjektiMuutoksetVelhosta(oid: string): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.synkronoiProjektiMuutoksetVelhosta, {
      oid,
    } as SynkronoiProjektiMuutoksetVelhostaMutationVariables);
  }

  async listKirjaamoOsoitteet(): Promise<KirjaamoOsoite[]> {
    return await this.callYllapitoAPI(apiConfig.listKirjaamoOsoitteet);
  }

  async listaaLisaAineisto(oid: string, lisaAineistoTiedot: ListaaLisaAineistoInput): Promise<LadattavatTiedostot> {
    return await this.callAPI(apiConfig.listaaLisaAineisto, {
      oid,
      lisaAineistoTiedot,
    } as ListaaLisaAineistoQueryVariables);
  }

  async listaaLausuntoPyynnonTiedostot(
    oid: string,
    listaaLausuntoPyyntoTiedostotInput: ListaaLausuntoPyyntoTiedostotInput
  ): Promise<LadattavatTiedostot> {
    return await this.callAPI(apiConfig.listaaLausuntoPyynnonTiedostot, {
      oid,
      listaaLausuntoPyyntoTiedostotInput,
    } as ListaaLausuntoPyynnonTiedostotQueryVariables);
  }

  async listaaLausuntoPyynnonTaydennyksenTiedostot(
    oid: string,
    listaaLausuntoPyynnonTaydennyksenTiedostotInput: ListaaLausuntoPyynnonTaydennyksenTiedostotInput
  ): Promise<LadattavatTiedostot> {
    return await this.callAPI(apiConfig.listaaLausuntoPyynnonTaydennyksenTiedostot, {
      oid,
      listaaLausuntoPyynnonTaydennyksenTiedostotInput,
    } as ListaaLausuntoPyynnonTaydennyksenTiedostotQueryVariables);
  }

  async listaaHyvaksymisEsityksenTiedostot(
    oid: string,
    listaaHyvaksymisEsityksenTiedostotInput: ListaaHyvaksymisEsityksenTiedostotInput
  ): Promise<HyvaksymisEsityksenAineistot> {
    return await this.callAPI(apiConfig.listaaHyvaksymisEsityksenTiedostot, {
      oid,
      listaaHyvaksymisEsityksenTiedostotInput,
    } as ListaaHyvaksymisEsityksenTiedostotQueryVariables);
  }

  async esikatseleLausuntoPyynnonTiedostot(oid: string, lausuntoPyynto: LausuntoPyyntoInput): Promise<LadattavatTiedostot> {
    return await this.callYllapitoAPI(apiConfig.esikatseleLausuntoPyynnonTiedostot, {
      oid,
      lausuntoPyynto,
    } as EsikatseleLausuntoPyynnonTiedostotQueryVariables);
  }

  async esikatseleLausuntoPyynnonTaydennysTiedostot(
    oid: string,
    lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennysInput
  ): Promise<LadattavatTiedostot> {
    return await this.callYllapitoAPI(apiConfig.esikatseleLausuntoPyynnonTaydennysTiedostot, {
      oid,
      lausuntoPyynnonTaydennys,
    } as EsikatseleLausuntoPyynnonTaydennysTiedostotQueryVariables);
  }

  async esikatseleHyvaksymisEsityksenTiedostot(
    oid: string,
    hyvaksymisEsitys: HyvaksymisEsitysInput
  ): Promise<HyvaksymisEsityksenAineistot> {
    return await this.callYllapitoAPI(apiConfig.esikatseleHyvaksymisEsityksenTiedostot, {
      oid,
      hyvaksymisEsitys,
    } as EsikatseleHyvaksymisEsityksenTiedostotQueryVariables);
  }

  async suoritaTestiKomento(testiKomento: TestiKomentoInput): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.suoritaTestiKomento, {
      testiKomento,
    } as SuoritaTestiKomentoMutationVariables);
  }

  async tuoKarttarajausJaTallennaKiinteistotunnukset(
    oid: string,
    geoJSON: string,
    kiinteistotunnukset: string[],
    status: Status | null | undefined
  ): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.tuoKarttarajausJaTallennaKiinteistotunnukset, {
      oid,
      geoJSON,
      kiinteistotunnukset,
      status,
    } as TuoKarttarajausJaTallennaKiinteistotunnuksetMutationVariables);
  }

  async tallennaKiinteistonOmistajat(mutationVariables: TallennaKiinteistonOmistajatMutationVariables): Promise<string[]> {
    return await this.callYllapitoAPI(apiConfig.tallennaKiinteistonOmistajat, mutationVariables);
  }

  async haeKiinteistonOmistajat(
    oid: string,
    muutOmistajat: boolean,
    query: string | null | undefined,
    from: number | null | undefined,
    size: number | null | undefined,
    onlyUserCreated?: boolean | null | undefined,
    filterUserCreated?: boolean | null | undefined
  ): Promise<KiinteistonOmistajat> {
    return await this.callYllapitoAPI(apiConfig.haeKiinteistonOmistajat, {
      oid,
      muutOmistajat,
      query,
      from,
      size,
      filterUserCreated,
      onlyUserCreated,
    } as HaeKiinteistonOmistajatQueryVariables);
  }

  async haeMuistuttajat(
    oid: string,
    muutMuistuttajat: boolean,
    query: string | null | undefined,
    from: number | null | undefined,
    size: number | null | undefined
  ): Promise<Muistuttajat> {
    return await this.callYllapitoAPI(apiConfig.haeMuistuttajat, {
      oid,
      muutMuistuttajat,
      query,
      from,
      size,
    } as HaeMuistuttajatQueryVariables);
  }

  async haeKayttoOikeudet(oid: string): Promise<KayttoOikeusTiedot> {
    return await this.callYllapitoAPI(apiConfig.haeKayttoOikeudet, {
      oid,
    } as HaeKayttoOikeudetQueryVariables);
  }

  async tallennaMuistuttajat(mutationVariables: TallennaMuistuttajatMutationVariables): Promise<string[]> {
    return await this.callYllapitoAPI(apiConfig.tallennaMuistuttajat, mutationVariables);
  }

  async lataaTiedotettavatExcel(oid: string, suomifi: boolean | undefined | null, kiinteisto: boolean): Promise<Excel> {
    return await this.callYllapitoAPI(apiConfig.lataaTiedotettavatExcel, {
      oid,
      suomifi,
      kiinteisto,
    } as LataaTiedotettavatExcelQueryVariables);
  }

  async haeProjektinTiedottamistiedot(oid: string): Promise<ProjektinTiedottaminen> {
    return await this.callYllapitoAPI(apiConfig.haeProjektinTiedottamistiedot, {
      oid,
    } as HaeProjektinTiedottamistiedotQueryVariables);
  }

  abstract callYllapitoAPI(operation: OperationConfig, variables?: any): Promise<any>;

  abstract callAPI(operation: OperationConfig, variables?: any): Promise<any>;

  setOneTimeForwardHeaders(headers: IncomingHttpHeaders): void {
    this.oneTimeHeaders = { cookie: headers.cookie, authorization: headers.authorization };
  }
}
