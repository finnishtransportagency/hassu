import {
  Kayttaja,
  KuulutusTyyppi,
  LataaKuulutusPDFQueryVariables,
  LataaProjektiQueryVariables,
  LatausTiedot,
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
  lataaKuulutusPDF: OperationConfig;
  valmisteleTiedostonLataus: OperationConfig;
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
  lataaKuulutusPDF: {
    name: "lataaKuulutusPDF",
    operationType: OperationType.Query,
    graphql: queries.lataaKuulutusPDF,
  },
  valmisteleTiedostonLataus: {
    name: "valmisteleTiedostonLataus",
    operationType: OperationType.Query,
    graphql: queries.valmisteleTiedostonLataus,
  },
};

export abstract class AbstractApi {
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

  async listUsers(): Promise<Kayttaja[]> {
    return await this.callYllapitoAPI(apiConfig.listaaKayttajat);
  }

  async lataaKuulutusPDF(oid: string, kuulutusTyyppi: KuulutusTyyppi): Promise<PDF> {
    return await this.callYllapitoAPI(apiConfig.lataaKuulutusPDF, {
      oid,
      kuulutusTyyppi,
    } as LataaKuulutusPDFQueryVariables);
  }

  abstract callYllapitoAPI(operation: OperationConfig, variables?: any): Promise<any>;

  abstract callAPI(operation: OperationConfig, variables?: any): Promise<any>;
}
