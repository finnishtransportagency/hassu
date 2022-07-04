import {
  ArkistoiProjektiMutationVariables,
  AsiakirjaTyyppi,
  EsikatseleAsiakirjaPDFQueryVariables,
  HaeProjektiMuutoksetVelhostaQueryVariables,
  HaeVelhoProjektiAineistoLinkkiQueryVariables,
  Kayttaja,
  Kieli,
  KirjaamoOsoite,
  LaskePaattymisPaivaQueryVariables,
  LaskuriTyyppi,
  LataaProjektiQueryVariables,
  LatausTiedot,
  LisaAineisto,
  LisaaMuistutusMutationVariables,
  LisaaPalauteMutationVariables,
  ListaaKayttajatInput,
  ListaaKayttajatQueryVariables,
  ListaaLisaAineistoInput,
  ListaaLisaAineistoQueryVariables,
  ListaaProjektitInput,
  ListaaProjektitQueryVariables,
  ListaaVelhoProjektiAineistotQueryVariables,
  ListaaVelhoProjektitQueryVariables,
  MuistutusInput,
  NykyinenKayttaja,
  OtaPalauteKasittelyynMutationVariables,
  PalauteInput,
  PDF,
  Projekti,
  ProjektiHakutulos,
  ProjektiHakutulosJulkinen,
  ProjektiJulkinen,
  SiirraTilaMutationVariables,
  SynkronoiProjektiMuutoksetVelhostaMutationVariables,
  TallennaProjektiInput,
  TallennaProjektiMutationVariables,
  TilaSiirtymaInput,
  ValmisteleTiedostonLatausQueryVariables,
  Velho,
  VelhoAineistoKategoria,
  VelhoHakuTulos,
} from "./graphql/apiModel";
import * as queries from "./graphql/queries";
import * as mutations from "./graphql/mutations";
import log from "loglevel";
import { IncomingHttpHeaders } from "http";

export enum OperationType {
  Mutation,
  Query,
}

type OperationName = keyof typeof queries | keyof typeof mutations;

export type OperationConfig = {
  name: OperationName;
  operationType: OperationType;
  graphql: string;
};

type ApiConfig = { [operationName in OperationName]: OperationConfig };

export const apiConfig: ApiConfig = {
  tallennaProjekti: {
    name: "tallennaProjekti",
    operationType: OperationType.Mutation,
    graphql: mutations.tallennaProjekti,
  },
  lataaProjekti: {
    name: "lataaProjekti",
    operationType: OperationType.Query,
    graphql: queries.lataaProjekti,
  },
  listaaProjektit: {
    name: "listaaProjektit",
    operationType: OperationType.Query,
    graphql: queries.listaaProjektit,
  },
  listaaVelhoProjektit: {
    name: "listaaVelhoProjektit",
    operationType: OperationType.Query,
    graphql: queries.listaaVelhoProjektit,
  },
  nykyinenKayttaja: {
    name: "nykyinenKayttaja",
    operationType: OperationType.Query,
    graphql: queries.nykyinenKayttaja,
  },
  listaaKayttajat: {
    name: "listaaKayttajat",
    operationType: OperationType.Query,
    graphql: queries.listaaKayttajat,
  },
  esikatseleAsiakirjaPDF: {
    name: "esikatseleAsiakirjaPDF",
    operationType: OperationType.Query,
    graphql: queries.esikatseleAsiakirjaPDF,
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
  },
  siirraTila: {
    name: "siirraTila",
    operationType: OperationType.Mutation,
    graphql: mutations.siirraTila,
  },
  arkistoiProjekti: {
    name: "arkistoiProjekti",
    operationType: OperationType.Mutation,
    graphql: mutations.arkistoiProjekti,
  },
  listaaVelhoProjektiAineistot: {
    name: "listaaVelhoProjektiAineistot",
    operationType: OperationType.Query,
    graphql: queries.listaaVelhoProjektiAineistot,
  },
  haeVelhoProjektiAineistoLinkki: {
    name: "haeVelhoProjektiAineistoLinkki",
    operationType: OperationType.Query,
    graphql: queries.haeVelhoProjektiAineistoLinkki,
  },
  lisaaPalaute: {
    name: "lisaaPalaute",
    operationType: OperationType.Mutation,
    graphql: mutations.lisaaPalaute,
  },
  otaPalauteKasittelyyn: {
    name: "otaPalauteKasittelyyn",
    operationType: OperationType.Mutation,
    graphql: mutations.otaPalauteKasittelyyn,
  },
  haeProjektiMuutoksetVelhosta: {
    name: "haeProjektiMuutoksetVelhosta",
    operationType: OperationType.Query,
    graphql: queries.haeProjektiMuutoksetVelhosta,
  },
  synkronoiProjektiMuutoksetVelhosta: {
    name: "synkronoiProjektiMuutoksetVelhosta",
    operationType: OperationType.Mutation,
    graphql: mutations.synkronoiProjektiMuutoksetVelhosta,
  },
  listKirjaamoOsoitteet: {
    name: "listKirjaamoOsoitteet",
    operationType: OperationType.Query,
    graphql: queries.listKirjaamoOsoitteet,
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
};

export abstract class AbstractApi {
  oneTimeHeaders: IncomingHttpHeaders | undefined;

  async lataaProjekti(oid: string): Promise<Projekti> {
    return await this.callYllapitoAPI(apiConfig.lataaProjekti, {
      oid,
    } as LataaProjektiQueryVariables);
  }

  async lataaProjektiJulkinen(oid: string): Promise<ProjektiJulkinen> {
    return await this.callAPI(apiConfig.lataaProjekti, {
      oid,
    } as LataaProjektiQueryVariables);
  }

  async tallennaProjekti(input: TallennaProjektiInput) {
    return await this.callYllapitoAPI(apiConfig.tallennaProjekti, {
      projekti: input,
    } as TallennaProjektiMutationVariables);
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

  async listaaVelhoProjektiAineistot(oid: string): Promise<VelhoAineistoKategoria[]> {
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
    return await this.callYllapitoAPI(apiConfig.valmisteleTiedostonLataus, {
      tiedostoNimi,
      contentType,
    } as ValmisteleTiedostonLatausQueryVariables);
  }

  async listProjektit(hakuehto: ListaaProjektitInput): Promise<ProjektiHakutulos> {
    return await this.callYllapitoAPI(apiConfig.listaaProjektit, { hakuehto } as ListaaProjektitQueryVariables);
  }

  async listProjektitJulkinen(hakuehto: ListaaProjektitInput): Promise<ProjektiHakutulosJulkinen> {
    return await this.callAPI(apiConfig.listaaProjektit, { hakuehto } as ListaaProjektitQueryVariables);
  }

  async listPublicProjektit(hakuehto: ListaaProjektitInput): Promise<ProjektiHakutulos> {
    return await this.callAPI(apiConfig.listaaProjektit, { hakuehto } as ListaaProjektitQueryVariables);
  }

  async getCurrentUser(): Promise<NykyinenKayttaja | undefined> {
    try {
      return await this.callYllapitoAPI(apiConfig.nykyinenKayttaja);
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

  async lisaaPalaute(oid: string, palaute: PalauteInput): Promise<string> {
    return await this.callAPI(apiConfig.lisaaPalaute, {
      oid,
      palaute,
    } as LisaaPalauteMutationVariables);
  }

  async lisaaMuistutus(oid: string, muistutus: MuistutusInput): Promise<string> {
    return await this.callAPI(apiConfig.lisaaMuistutus, {
      oid,
      muistutus,
    } as LisaaMuistutusMutationVariables);
  }

  async otaPalauteKasittelyyn(oid: string, id: string): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.otaPalauteKasittelyyn, {
      oid,
      id,
    } as OtaPalauteKasittelyynMutationVariables);
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

  async listaaLisaAineisto(oid: string, lisaAineistoTiedot: ListaaLisaAineistoInput): Promise<LisaAineisto[]> {
    return await this.callYllapitoAPI(apiConfig.listaaLisaAineisto, {
      oid,
      lisaAineistoTiedot,
    } as ListaaLisaAineistoQueryVariables);
  }

  abstract callYllapitoAPI(operation: OperationConfig, variables?: any): Promise<any>;

  abstract callAPI(operation: OperationConfig, variables?: any): Promise<any>;

  setOneTimeForwardHeaders(headers: IncomingHttpHeaders) {
    this.oneTimeHeaders = { cookie: headers.cookie, authorization: headers.authorization };
  }
}
