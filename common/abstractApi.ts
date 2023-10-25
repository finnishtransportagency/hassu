import {
  AnnaPalautettaPalvelustaMutationVariables,
  ArkistoiProjektiMutationVariables,
  AsetaPalauteVastattuMutationVariables,
  AsiakirjaTyyppi,
  EsikatseleAsiakirjaPDFQueryVariables,
  HaeProjektiMuutoksetVelhostaQueryVariables,
  HaeVelhoProjektiAineistoLinkkiQueryVariables,
  Kayttaja,
  Kieli,
  KirjaamoOsoite,
  LaskePaattymisPaivaQueryVariables,
  LaskuriTyyppi,
  LataaPalautteetPDFQueryVariables,
  LataaProjektiJulkinenQueryVariables,
  LataaProjektiQueryVariables,
  LatausTiedot,
  LisaAineistot,
  LisaaMuistutusMutationVariables,
  LisaaPalauteMutationVariables,
  ListaaKayttajatInput,
  ListaaKayttajatQueryVariables,
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

  async listaaLisaAineisto(oid: string, lisaAineistoTiedot: ListaaLisaAineistoInput): Promise<LisaAineistot> {
    return await this.callAPI(apiConfig.listaaLisaAineisto, {
      oid,
      lisaAineistoTiedot,
    } as ListaaLisaAineistoQueryVariables);
  }

  async suoritaTestiKomento(testiKomento: TestiKomentoInput): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.suoritaTestiKomento, {
      testiKomento,
    } as SuoritaTestiKomentoMutationVariables);
  }

  abstract callYllapitoAPI(operation: OperationConfig, variables?: any): Promise<any>;

  abstract callAPI(operation: OperationConfig, variables?: any): Promise<any>;

  setOneTimeForwardHeaders(headers: IncomingHttpHeaders): void {
    this.oneTimeHeaders = { cookie: headers.cookie, authorization: headers.authorization };
  }
}
