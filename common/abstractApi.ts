import {
  ArkistoiProjektiMutationVariables,
  AsiakirjaTyyppi,
  EsikatseleAsiakirjaPDFQueryVariables,
  Kayttaja,
  Kieli,
  LaskePaattymisPaivaQueryVariables,
  LaskuriTyyppi,
  LataaProjektiQueryVariables,
  LatausTiedot,
  ListaaKayttajatInput,
  ListaaKayttajatQueryVariables,
  ListaaProjektitInput,
  ListaaProjektitQueryVariables,
  ListaaVelhoProjektitQueryVariables,
  NykyinenKayttaja,
  PDF,
  Projekti,
  ProjektiHakutulos,
  ProjektiJulkinen,
  SiirraTilaMutationVariables,
  TallennaProjektiInput,
  TallennaProjektiMutationVariables,
  TilaSiirtymaInput,
  ValmisteleTiedostonLatausQueryVariables,
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

  async valmisteleTiedostonLataus(tiedostoNimi: string): Promise<LatausTiedot> {
    return await this.callYllapitoAPI(apiConfig.valmisteleTiedostonLataus, {
      tiedostoNimi,
    } as ValmisteleTiedostonLatausQueryVariables);
  }

  async listProjektit(hakuehto: ListaaProjektitInput): Promise<ProjektiHakutulos> {
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
    muutokset?: TallennaProjektiInput
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

  abstract callYllapitoAPI(operation: OperationConfig, variables?: any): Promise<any>;

  abstract callAPI(operation: OperationConfig, variables?: any): Promise<any>;

  setOneTimeForwardHeaders(headers: IncomingHttpHeaders) {
    this.oneTimeHeaders = { cookie: headers.cookie, authorization: headers.authorization };
  }
}
