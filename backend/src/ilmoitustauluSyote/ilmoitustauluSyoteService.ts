import { Kieli, KuulutusJulkaisuTila, ProjektiJulkinen, VuorovaikutusKierrosTila } from "../../../common/graphql/apiModel";
import { openSearchClientIlmoitustauluSyote } from "../projektiSearch/openSearchClient";
import { ilmoitusKuulutusAdapter } from "./ilmoitustauluSyoteAdapter";
import { log } from "../logger";

class IlmoitustauluSyoteService {
  async index(projekti: ProjektiJulkinen) {
    const oid = projekti.oid;
    try {
      const kielet = ilmoitusKuulutusAdapter.getProjektiKielet(projekti);
      await this.indexAloitusKuulutusJulkaisut(projekti, kielet, oid);
      await this.indexVuorovaikutusKierrokset(projekti, kielet, oid);
      await this.indexNahtavillaoloVaihe(projekti, kielet, oid);
      await this.indexHyvaksymisPaatosVaihe(projekti, kielet, oid);
    } catch (e) {
      log.error("IlmoitustauluSyoteService.index failed.", { projekti });
      log.error(e);
    }
  }

  private async indexAloitusKuulutusJulkaisut(projekti: ProjektiJulkinen, kielet: Kieli[], oid: string) {
    const aloitusKuulutusJulkaisu = projekti.aloitusKuulutusJulkaisu;
    if (aloitusKuulutusJulkaisu?.tila == KuulutusJulkaisuTila.HYVAKSYTTY) {
      for (const kieli of kielet) {
        await openSearchClientIlmoitustauluSyote.putDocument(
          ilmoitusKuulutusAdapter.createKeyForAloitusKuulutusJulkaisu(oid, aloitusKuulutusJulkaisu, kieli),
          ilmoitusKuulutusAdapter.adaptAloitusKuulutusJulkaisu(oid, projekti.lyhytOsoite, aloitusKuulutusJulkaisu, kieli)
        );
      }
    }
  }

  private async indexVuorovaikutusKierrokset(projekti: ProjektiJulkinen, kielet: Kieli[], oid: string) {
    if (projekti.vuorovaikutukset && projekti.vuorovaikutukset.tila === VuorovaikutusKierrosTila.JULKINEN) {
      for (const kieli of kielet) {
        await openSearchClientIlmoitustauluSyote.putDocument(
          ilmoitusKuulutusAdapter.createKeyForVuorovaikutusKierrosJulkaisu(oid, projekti.vuorovaikutukset, kieli),
          ilmoitusKuulutusAdapter.adaptVuorovaikutusKierrosJulkaisu(
            oid,
            projekti.lyhytOsoite,
            projekti.vuorovaikutukset,
            kieli,
            projekti.kielitiedot,
            projekti.velho
          )
        );
      }
    }
  }

  private async indexNahtavillaoloVaihe(projekti: ProjektiJulkinen, kielet: Kieli[], oid: string) {
    const nahtavillaoloVaihe = projekti.nahtavillaoloVaihe;
    if (nahtavillaoloVaihe?.tila == KuulutusJulkaisuTila.HYVAKSYTTY) {
      for (const kieli of kielet) {
        await openSearchClientIlmoitustauluSyote.putDocument(
          ilmoitusKuulutusAdapter.createKeyForNahtavillaoloVaihe(oid, nahtavillaoloVaihe, kieli),
          ilmoitusKuulutusAdapter.adaptNahtavillaoloVaihe(oid, projekti.lyhytOsoite, nahtavillaoloVaihe, kieli)
        );
      }
    }
  }

  private async indexHyvaksymisPaatosVaihe(projekti: ProjektiJulkinen, kielet: Kieli[], oid: string) {
    const nahtavillaoloVaihe = projekti.hyvaksymisPaatosVaihe;
    if (nahtavillaoloVaihe?.tila == KuulutusJulkaisuTila.HYVAKSYTTY) {
      for (const kieli of kielet) {
        await openSearchClientIlmoitustauluSyote.putDocument(
          ilmoitusKuulutusAdapter.createKeyForHyvaksymisPaatosVaihe(oid, nahtavillaoloVaihe, kieli),
          ilmoitusKuulutusAdapter.adaptHyvaksymisPaatosVaihe(oid, projekti.lyhytOsoite, nahtavillaoloVaihe, kieli)
        );
      }
    }
  }

  async remove(oid: string) {
    const searchResult = await openSearchClientIlmoitustauluSyote.query({
      query: {
        bool: {
          must: [
            {
              term: { "oid.keyword": oid },
            },
          ],
        },
      },
    });

    if (searchResult.hits?.hits) {
      for (const item of searchResult.hits?.hits) {
        await openSearchClientIlmoitustauluSyote.deleteDocument(item._id);
      }
    }
  }
}

export const ilmoitustauluSyoteService = new IlmoitustauluSyoteService();
