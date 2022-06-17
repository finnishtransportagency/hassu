import { AloitusKuulutusTila, ProjektiJulkinen } from "../../../common/graphql/apiModel";
import { openSearchClientIlmoitustauluSyote } from "../projektiSearch/openSearchClient";
import { ilmoitusKuulutusAdapter } from "./ilmoitustauluSyoteAdapter";

class IlmoitustauluSyoteService {
  async index(projekti: ProjektiJulkinen) {
    const oid = projekti.oid;
    const kielet = ilmoitusKuulutusAdapter.getProjektiKielet(projekti);

    const aloitusKuulutusJulkaisut = projekti.aloitusKuulutusJulkaisut?.filter(
      (julkaisu) => julkaisu.tila == AloitusKuulutusTila.HYVAKSYTTY
    );
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
