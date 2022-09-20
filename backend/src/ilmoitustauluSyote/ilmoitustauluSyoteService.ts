import { AloitusKuulutusTila, Kieli, ProjektiJulkinen } from "../../../common/graphql/apiModel";
import { openSearchClientIlmoitustauluSyote } from "../projektiSearch/openSearchClient";
import { ilmoitusKuulutusAdapter } from "./ilmoitustauluSyoteAdapter";
import { findJulkaisutWithTila } from "../projekti/projektiUtil";

class IlmoitustauluSyoteService {
  async index(projekti: ProjektiJulkinen) {
    const oid = projekti.oid;
    const kielet = ilmoitusKuulutusAdapter.getProjektiKielet(projekti);
    await this.indexAloitusKuulutusJulkaisut(projekti, kielet, oid);
    await this.indexNahtavillaoloVaihe(projekti, kielet, oid);
    await this.indexHyvaksymisPaatosVaihe(projekti, kielet, oid);
  }

  private async indexAloitusKuulutusJulkaisut(projekti: ProjektiJulkinen, kielet: Kieli[], oid: string) {
    const aloitusKuulutusJulkaisut = findJulkaisutWithTila(projekti.aloitusKuulutusJulkaisut, AloitusKuulutusTila.HYVAKSYTTY);
    if (aloitusKuulutusJulkaisut) {
      for (const aloitusKuulutusJulkaisu of aloitusKuulutusJulkaisut) {
        for (const kieli of kielet) {
          await openSearchClientIlmoitustauluSyote.putDocument(
            ilmoitusKuulutusAdapter.createKeyForAloitusKuulutusJulkaisu(oid, aloitusKuulutusJulkaisu, kieli),
            ilmoitusKuulutusAdapter.adaptAloitusKuulutusJulkaisu(oid, aloitusKuulutusJulkaisu, kieli)
          );
        }
      }
    }
  }

  private async indexNahtavillaoloVaihe(projekti: ProjektiJulkinen, kielet: Kieli[], oid: string) {
    const nahtavillaoloVaihe = projekti.nahtavillaoloVaihe;
    if (nahtavillaoloVaihe) {
      for (const kieli of kielet) {
        await openSearchClientIlmoitustauluSyote.putDocument(
          ilmoitusKuulutusAdapter.createKeyForNahtavillaoloVaihe(oid, nahtavillaoloVaihe, kieli),
          ilmoitusKuulutusAdapter.adaptNahtavillaoloVaihe(oid, nahtavillaoloVaihe, kieli)
        );
      }
    }
  }

  private async indexHyvaksymisPaatosVaihe(projekti: ProjektiJulkinen, kielet: Kieli[], oid: string) {
    const nahtavillaoloVaihe = projekti.hyvaksymisPaatosVaihe;
    if (nahtavillaoloVaihe) {
      for (const kieli of kielet) {
        await openSearchClientIlmoitustauluSyote.putDocument(
          ilmoitusKuulutusAdapter.createKeyForHyvaksymisPaatosVaihe(oid, nahtavillaoloVaihe, kieli),
          ilmoitusKuulutusAdapter.adaptHyvaksymisPaatosVaihe(oid, nahtavillaoloVaihe, kieli)
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
