import {
  AsiakirjaTyyppi,
  Kayttaja,
  LaskePaattymisPaivaQueryVariables,
  LaskuriTyyppi,
  LataaAsiakirjaPDFQueryVariables,
  LataaProjektiQueryVariables,
  LatausTiedot,
  ListaaKayttajatInput,
  ListaaKayttajatQueryVariables,
  ListaaVelhoProjektitQueryVariables,
  NykyinenKayttaja,
  PDF,
  Projekti,
  TallennaProjektiInput,
  TallennaProjektiMutationVariables,
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

export type OperationConfig = {
  name: string;
  operationType: OperationType;
  graphql: string;
};

type ApiConfig = {
  tallennaProjekti: OperationConfig;
  lataaProjekti: OperationConfig;
  listaaProjektit: OperationConfig;
  listaaVelhoProjektit: OperationConfig;
  nykyinenKayttaja: OperationConfig;
  listaaKayttajat: OperationConfig;
  lataaAsiakirjaPDF: OperationConfig;
  valmisteleTiedostonLataus: OperationConfig;
  laskePaattymisPaiva: OperationConfig;
};

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
  lataaAsiakirjaPDF: {
    name: "lataaAsiakirjaPDF",
    operationType: OperationType.Query,
    graphql: queries.lataaAsiakirjaPDF,
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

  async lataaAsiakirjaPDF(
    oid: string,
    asiakirjaTyyppi: AsiakirjaTyyppi,
    muutokset?: TallennaProjektiInput
  ): Promise<PDF> {
    return await this.callYllapitoAPI(apiConfig.lataaAsiakirjaPDF, {
      oid,
      asiakirjaTyyppi,
      muutokset,
    } as LataaAsiakirjaPDFQueryVariables);
  }

  async laskePaattymisPaiva(alkupaiva: string, tyyppi: LaskuriTyyppi): Promise<string> {
    return await this.callYllapitoAPI(apiConfig.laskePaattymisPaiva, {
      alkupaiva,
      tyyppi,
    } as LaskePaattymisPaivaQueryVariables);
  }

  abstract callYllapitoAPI(operation: OperationConfig, variables?: any): Promise<any>;

  abstract callAPI(operation: OperationConfig, variables?: any): Promise<any>;

  setOneTimeForwardHeaders(headers: IncomingHttpHeaders) {
    this.oneTimeHeaders = { cookie: headers.cookie, authorization: headers.authorization };
  }
}
