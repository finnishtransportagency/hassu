import { auditLog, log, recordVelhoLatencyDecorator, VelhoApiName } from "../logger";
import { config } from "../config";
import * as HakuPalvelu from "./hakupalvelu";
import * as ProjektiRekisteri from "./projektirekisteri";
import type { ProjektiToimeksiannotInner } from "./projektirekisteri";
import * as AineistoPalvelu from "./aineistopalvelu";
import { VelhoAineisto, VelhoHakuTulos, VelhoToimeksianto } from "hassu-common/graphql/apiModel";
import {
  adaptDokumenttiTyyppi,
  adaptProjekti,
  adaptSearchResults,
  applyAloitusKuulutusPaivaToVelho,
  applyKasittelyntilaToVelho,
  applySuunnittelunTilaToVelho,
  ProjektiSearchResult,
} from "./velhoAdapter";
import { VelhoError } from "hassu-common/error";
import type { AxiosError, AxiosRequestConfig, AxiosStatic } from "axios";
import type { AloitusKuulutusJulkaisu, DBProjekti, KasittelynTila } from "../database/model";
import { personSearch } from "../personSearch/personSearchClient";
import dayjs from "dayjs";
import { getAxios } from "../aws/monitoring";
import { assertIsDefined } from "../util/assertions";
import { PartiallyMandatory } from "../tiedostot/PartiallyMandatory";
import { VelhoUnavailableError } from "hassu-common/error/velhoUnavailableError";

import NodeCache from "node-cache";
import { isEmpty } from "lodash";
import { suunnitelmanTilat } from "hassu-common/generated/kasittelynTila";

const accessTokenCache = new NodeCache({
  stdTTL: 1000, // Not really used, because the TTL is set based on the expiration time specified by Velho
});
const ACCESS_TOKEN_CACHE_KEY = "accessToken";

type VelhoProjektiDataUpdater = (projekti: ProjektiRekisteri.ProjektiProjektiMuokkaus) => ProjektiRekisteri.ProjektiProjektiMuokkaus;

export class VelhoClient {
  public async authenticate(): Promise<string> {
    try {
      const axios = getAxios();
      let accessToken = accessTokenCache.get(ACCESS_TOKEN_CACHE_KEY);
      if (accessToken) {
        return accessToken as string;
      }
      const response = await this.callAuthenticate(axios);
      accessToken = response.data.access_token;
      const expiresInSeconds = response.data.expires_in;
      // Expire token 10 seconds earlier than it really expires for safety margin
      accessTokenCache.set(ACCESS_TOKEN_CACHE_KEY, accessToken);
      accessTokenCache.ttl(ACCESS_TOKEN_CACHE_KEY, expiresInSeconds - 10);
      return accessToken as string;
    } catch (e) {
      throw this.checkVelhoError(e);
    }
  }

  @recordVelhoLatencyDecorator(VelhoApiName.authenticate, "authenticate")
  private callAuthenticate(axios: AxiosStatic) {
    assertIsDefined(config.velhoAuthURL, "process.env.VELHO_AUTH_URL puuttuu");
    assertIsDefined(config.velhoUsername, "process.env.VELHO_USERNAME puuttuu");
    assertIsDefined(config.velhoPassword, "process.env.VELHO_PASSWORD puuttuu");
    return axios.post(config.velhoAuthURL, "grant_type=client_credentials", {
      auth: { username: config.velhoUsername, password: config.velhoPassword },
    });
  }

  /** Method to remove access token for testing purposes */
  public logout(): void {
    accessTokenCache.del(ACCESS_TOKEN_CACHE_KEY);
  }

  @recordVelhoLatencyDecorator(VelhoApiName.hakuApi, "hakupalveluApiV1HakuKohdeluokatPost")
  public async searchProjects(term: string, requireExactMatch?: boolean): Promise<VelhoHakuTulos[]> {
    try {
      const hakuApi = await this.createHakuApi();
      let searchClause;
      if (requireExactMatch) {
        searchClause = ["yhtasuuri", ["projekti/projekti", "ominaisuudet", "nimi"], term];
      } else {
        // TODO: add kunta field into target field as well
        searchClause = ["sisaltaa-tekstin", ["projekti/projekti", "ominaisuudet", "nimi"], term];
      }
      const response = await hakuApi.hakupalveluApiV1HakuKohdeluokatPost({
        asetukset: {
          "palautettavat-kentat": [
            ["projekti/projekti", "oid"],
            ["projekti/projekti", "ominaisuudet", "nimi"],
            ["projekti/projekti", "ominaisuudet", "vaihe"],
            ["projekti/projekti", "ominaisuudet", "vastuuhenkilo"],
            ["projekti/projekti", "ominaisuudet", "asiatunnus-vaylavirasto"],
            ["projekti/projekti", "ominaisuudet", "asiatunnus-ely"],
            ["projekti/projekti", "ominaisuudet", "asiatunnus-traficom"],
            ["projekti/projekti", "ominaisuudet", "tilaajaorganisaatio"],
          ],
          tyyppi: HakuPalvelu.HakulausekeAsetuksetTyyppiEnum.Kohdeluokkahaku,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          jarjesta: [[["projekti/projekti", "ominaisuudet", "nimi"], "nouseva" as any]], // NOSONAR
        },
        lauseke: [
          "ja",
          ["joukossa", ["projekti/projekti", "ominaisuudet", "vaihe"], ["vaihe/vaihe04", "vaihe/vaihe10", "vaihe/vaihe12"]],
          ["yhtasuuri", ["projekti/projekti", "ominaisuudet", "tila"], "tila/tila15"],
          searchClause,
        ],
        kohdeluokat: ["projekti/projekti"],
      });
      const data = response.data;
      const resultCount = data?.osumia || 0;
      if (requireExactMatch) {
        log.info(resultCount + " Velho search results for exact term: " + term);
      } else {
        log.info(resultCount + " Velho search results for term: " + term);
      }
      return adaptSearchResults(data.osumat as ProjektiSearchResult[], await personSearch.getKayttajas());
    } catch (e: unknown) {
      throw this.checkVelhoError(e);
    }
  }

  @recordVelhoLatencyDecorator(VelhoApiName.projektiApi, "projektirekisteriApiV2ProjektiProjektiOidGet")
  public async loadProjekti(oid: string): Promise<DBProjekti> {
    const projektiApi = await this.createProjektiRekisteriApi();
    let response;
    try {
      response = await projektiApi.projektirekisteriApiV2ProjektiProjektiOidGet(oid);

      let linkitResponse;
      if (!isEmpty(response.data.projektilinkit)) {
        linkitResponse = await projektiApi.projektirekisteriApiV2ProjektiProjektiOidLinkitGet(oid);
      }

      const result = await adaptProjekti(response.data, linkitResponse?.data as unknown as ProjektiRekisteri.ProjektiProjekti[]);
      return result;
    } catch (e: unknown) {
      throw this.checkVelhoError(e);
    }
  }

  private aineistoHasMetatiedot<T extends Record<string, unknown>>(aineisto: T): aineisto is T & { metatiedot: Record<string, unknown> } {
    return "metatiedot" in aineisto && typeof aineisto.metatiedot === "object" && aineisto.metatiedot != null;
  }

  private getAineistoDokumenttityyppi(
    aineisto: PartiallyMandatory<AineistoPalvelu.AineistoAineisto, "tuorein-versio">
  ): string | null | undefined {
    // Use the new schema as the source for the data.
    if (typeof aineisto.ominaisuudet?.dokumenttityyppi === "string") {
      return aineisto.ominaisuudet.dokumenttityyppi;
    }

    // Use the legacy metatiedot schema as a fallback source for the data.
    if (this.aineistoHasMetatiedot(aineisto) && typeof aineisto.metatiedot.dokumenttityyppi === "string") {
      return aineisto.metatiedot.dokumenttityyppi;
    }

    // No description found
    return null;
  }

  private getAineistoKuvaus(aineisto: PartiallyMandatory<AineistoPalvelu.AineistoAineisto, "tuorein-versio">): string | null | undefined {
    // Use the new schema as the source for the data.
    if (typeof aineisto.ominaisuudet?.kuvaus === "string") {
      return aineisto.ominaisuudet.kuvaus;
    }

    // Use the legacy metatiedot schema as a fallback source for the data.
    if (this.aineistoHasMetatiedot(aineisto) && typeof aineisto.metatiedot.kuvaus === "string") {
      return aineisto.metatiedot.kuvaus;
    }

    // No kuvaus found
    return null;
  }

  public async loadProjektiAineistot(oid: string): Promise<VelhoToimeksianto[]> {
    try {
      const toimeksiannot: ProjektiToimeksiannotInner[] = await this.listToimeksiannot(oid);
      const hakuApi = await this.createHakuApi();
      return await Promise.all<VelhoToimeksianto>(
        toimeksiannot.map(async (toimeksianto) => {
          const aineistoArray = await this.haeToimeksiannonAineistot(hakuApi, toimeksianto);
          const nimi: string = toimeksianto.ominaisuudet.nimi.trim();

          const aineistot: VelhoAineisto[] = aineistoArray
            .filter(
              (aineisto): aineisto is PartiallyMandatory<AineistoPalvelu.AineistoAineisto, "tuorein-versio"> => !!aineisto["tuorein-versio"]
            )
            .map((aineisto) => {
              const { dokumenttiTyyppi } = adaptDokumenttiTyyppi(`${this.getAineistoDokumenttityyppi(aineisto)}`);
              const tiedostoNimi = aineisto["tuorein-versio"].nimi;
              const muokattu = aineisto["tuorein-versio"].muokattu;
              const koko = aineisto["tuorein-versio"].koko;
              aineisto.ominaisuudet.kuvaus;
              return {
                __typename: "VelhoAineisto",
                oid: aineisto.oid,
                tiedosto: tiedostoNimi,
                kuvaus: this.getAineistoKuvaus(aineisto) ?? "",
                dokumenttiTyyppi,
                muokattu: dayjs(muokattu).format(),
                koko,
              };
            });
          return { __typename: "VelhoToimeksianto", nimi, aineistot, oid: toimeksianto.oid };
        })
      );
    } catch (e: unknown) {
      throw this.checkVelhoError(e);
    }
  }

  @recordVelhoLatencyDecorator(VelhoApiName.hakuApi, "hakupalveluApiV1HakuAineistotLinkitOidGet")
  private async haeToimeksiannonAineistot(
    hakuApi: HakuPalvelu.HakuApi,
    toimeksianto: ProjektiToimeksiannotInner
  ): Promise<AineistoPalvelu.AineistoAineisto[]> {
    try {
      const aineistotResponse = await hakuApi.hakupalveluApiV1HakuAineistotLinkitOidGet(toimeksianto.oid);
      return aineistotResponse.data as AineistoPalvelu.AineistoAineisto[];
    } catch (e) {
      throw this.checkVelhoError(e as Error);
    }
  }

  @recordVelhoLatencyDecorator(VelhoApiName.dokumenttiApi, "aineistopalveluApiV1AineistoOidDokumenttiGet")
  public async getLinkForDocument(dokumenttiOid: string): Promise<string> {
    try {
      const dokumenttiApi = await this.createDokumenttiApi();
      const dokumenttiResponse = await dokumenttiApi.aineistopalveluApiV1AineistoOidDokumenttiGet(dokumenttiOid);
      return dokumenttiResponse.headers.location;
    } catch (e) {
      throw this.checkVelhoError(e as Error);
    }
  }

  public async getAineisto(dokumenttiOid: string): Promise<{ disposition: string; contents: Buffer }> {
    try {
      const sourceURL = await velho.getLinkForDocument(dokumenttiOid);
      const axiosResponse = await getAxios().get(sourceURL, { responseType: "arraybuffer" });
      const disposition: string = axiosResponse.headers["content-disposition"];
      const contents = axiosResponse.data;
      return { disposition, contents };
    } catch (e) {
      throw this.checkVelhoError(e);
    }
  }

  @recordVelhoLatencyDecorator(VelhoApiName.projektiApi, "projektirekisteriApiV2ProjektiProjektiOidToimeksiannotGet")
  private async listToimeksiannot(oid: string): Promise<ProjektiToimeksiannotInner[]> {
    const projektiApi = await this.createProjektiRekisteriApi();
    const toimeksiannotResponse = await projektiApi.projektirekisteriApiV2ProjektiProjektiOidToimeksiannotGet(oid);
    const toimeksiannot: ProjektiToimeksiannotInner[] = [];
    toimeksiannotResponse.data.forEach((toimeksianto) => toimeksiannot.push(toimeksianto));
    return toimeksiannot;
  }

  @recordVelhoLatencyDecorator(VelhoApiName.projektiApi, "projektirekisteriApiV2ProjektiPost")
  public async createProjektiForTesting(
    velhoProjekti: ProjektiRekisteri.ProjektiProjektiLuonti
  ): Promise<ProjektiRekisteri.ProjektiProjekti> {
    const projektiApi = await this.createProjektiRekisteriApi();
    try {
      return (
        await projektiApi.projektirekisteriApiV2ProjektiPost(velhoProjekti, true, {
          params: { "raportoi-vkm-virheet": true },
        })
      ).data;
    } catch (e: unknown) {
      throw this.checkVelhoError(e);
    }
  }

  @recordVelhoLatencyDecorator(VelhoApiName.projektiApi, "projektirekisteriApiV2ProjektiProjektiOidGet")
  public async saveProjektiAloituskuulutusPaiva(oid: string, aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu): Promise<void> {
    await this.saveProjekti(oid, (projekti) =>
      applyAloitusKuulutusPaivaToVelho(projekti, aloitusKuulutusJulkaisu.kuulutusPaiva ?? undefined)
    );
  }

  @recordVelhoLatencyDecorator(VelhoApiName.projektiApi, "projektirekisteriApiV2ProjektiProjektiOidGet")
  public async saveProjektiSuunnitelmanTila(oid: string, tila: keyof typeof suunnitelmanTilat): Promise<void> {
    await this.saveProjekti(oid, (projekti) => applySuunnittelunTilaToVelho(projekti, tila));
  }

  public async saveKasittelynTila(oid: string, kasittelynTila: KasittelynTila): Promise<void> {
    await this.saveProjekti(oid, (projekti) => applyKasittelyntilaToVelho(projekti, kasittelynTila));
  }

  @recordVelhoLatencyDecorator(
    VelhoApiName.projektiApi,
    "projektirekisteriApiV2ProjektiProjektiOidGet,projektirekisteriApiV2ProjektiProjektiOidPut"
  )
  private async saveProjekti(oid: string, projektiDataUpdater: VelhoProjektiDataUpdater): Promise<void> {
    if (process.env.VELHO_READ_ONLY == "true") {
      throw new Error("Velho on lukutilassa testeissä. Lisää kutsu mockSaveProjektiToVelho().");
    }
    const projektiApi = await this.createProjektiRekisteriApi();
    try {
      // Haetaan ilman geometriatietoja, sillä niitä ei tarvita projektin päivityksessä
      const loadProjektiResponse = await projektiApi.projektirekisteriApiV2ProjektiProjektiOidGet(oid, true);
      const data = loadProjektiResponse.data;
      const projekti = projektiDataUpdater(data);
      auditLog.info("Päivitetään velhoprojekti", { velho: { oid, projekti } });
      await projektiApi.projektirekisteriApiV2ProjektiProjektiOidPut(oid, projekti, true);
    } catch (e: unknown) {
      throw this.checkVelhoError(e);
    }
  }

  @recordVelhoLatencyDecorator(VelhoApiName.projektiApi, "projektirekisteriApiV2ProjektiProjektiOidDelete")
  public async deleteProjektiForTesting(oid: string): Promise<ProjektiRekisteri.ProjektiProjekti> {
    const projektiApi = await this.createProjektiRekisteriApi();
    try {
      return (await projektiApi.projektirekisteriApiV2ProjektiProjektiOidDelete(oid)).data;
    } catch (e: unknown) {
      throw this.checkVelhoError(e);
    }
  }

  private async createHakuApi() {
    return new HakuPalvelu.HakuApi(new HakuPalvelu.Configuration(await this.getVelhoApiConfiguration()));
  }

  private async createProjektiRekisteriApi() {
    return new ProjektiRekisteri.ProjektiApi(new ProjektiRekisteri.Configuration(await this.getVelhoApiConfiguration()));
  }

  // private async createAineistoApi() {
  //   return new AineistoPalvelu.AineistoApi(new AineistoPalvelu.Configuration(await this.getVelhoApiConfiguration()));
  // }

  private async createDokumenttiApi() {
    const baseConfig = await this.getVelhoApiConfiguration();
    const baseOptions = baseConfig.baseOptions as AxiosRequestConfig;
    baseOptions.maxRedirects = 0;
    baseOptions.validateStatus = (status) => {
      return status >= 200 && status < 400;
    };
    return new AineistoPalvelu.DokumenttiApi(new AineistoPalvelu.Configuration(baseConfig));
  }

  private async getVelhoApiConfiguration() {
    return {
      basePath: config.velhoApiURL,
      baseOptions: { headers: { Authorization: "Bearer " + (await this.authenticate()) } },
    };
  }

  private checkVelhoError(e: unknown) {
    if (e instanceof VelhoUnavailableError || e instanceof VelhoError) {
      return e;
    }
    const response = (e as AxiosError).response;
    if (response) {
      if (response.status >= 500) {
        return new VelhoUnavailableError(response.status, response.statusText);
      }
      if (response.status >= 400) {
        log.error("Virhe Velho-rajapinnan kutsussa", {
          statusText: response.statusText,
          status: response.status,
          problems: (response.data as BadRequestResponse)?.problems,
        });
        return new VelhoError(response.status, response.statusText);
      }
    }
    return e;
  }
}

type BadRequestResponse = {
  problems: object;
  value: object;
};

export const velho = new VelhoClient();
