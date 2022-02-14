import {
  AsiakirjaTyyppi,
  EsikatseleAsiakirjaPDFQueryVariables,
  Kayttaja,
  LaskePaattymisPaivaQueryVariables,
  LaskuriTyyppi,
  LataaProjektiQueryVariables,
  LatausTiedot,
  ListaaKayttajatInput,
  ListaaKayttajatQueryVariables,
  ListaaVelhoProjektitQueryVariables,
  NykyinenKayttaja,
  PDF,
  Projekti,
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
};

export abstract class AbstractApi {
  oneTimeHeaders: IncomingHttpHeaders | undefined;

  async lataaProjekti(oid: string): Promise<Projekti> {
    return await this.callYllapitoAPI(apiConfig.lataaProjekti, {
      oid,
    } as LataaProjektiQueryVariables);
  }

  async tallennaProjekti(input: TallennaProjektiInput) {
    return await this.callYllapitoAPI(apiConfig.tallennaProjekti, {
      projekti: input,
    } as TallennaProjektiMutationVariables);
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

  async listProjektit(): Promise<Projekti[]> {
    return await this.callAPI(apiConfig.listaaProjektit);
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
    muutokset?: TallennaProjektiInput
  ): Promise<PDF> {
    return await this.callYllapitoAPI(apiConfig.esikatseleAsiakirjaPDF, {
      oid,
      asiakirjaTyyppi,
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
