import { Kieli, KuulutusJulkaisuTila, ProjektiJulkinen, VuorovaikutusKierrosTila } from "hassu-common/graphql/apiModel";
import { openSearchClientIlmoitustauluSyote } from "../projektiSearch/openSearchClientIlmoitustauluSyote";
import { GenericKuulutusJulkaisuJulkinen, ilmoitusKuulutusAdapter, JulkaisuVaiheIndexPart } from "./ilmoitustauluSyoteAdapter";
import { log } from "../logger";
import { ProjektiDocumentHit } from "../projektiSearch/projektiSearchAdapter";
import {
  JulkinenLinkFunction,
  linkAloituskuulutus,
  linkHyvaksymisPaatos,
  linkJatkoPaatos1,
  linkJatkoPaatos2,
  linkNahtavillaOlo,
} from "hassu-common/links";

class IlmoitustauluSyoteService {
  async index(projekti: ProjektiJulkinen) {
    const oid = projekti.oid;
    try {
      const kielet = ilmoitusKuulutusAdapter.getProjektiKielet(projekti);
      await this.indexKuulutusJulkaisut(
        kielet,
        oid,
        projekti.lyhytOsoite ?? undefined,
        projekti.aloitusKuulutusJulkaisu,
        linkAloituskuulutus,
        "aloitusKuulutus",
        "ui-otsikot.kuulutus_suunnitelman_alkamisesta"
      );
      await this.indexVuorovaikutusKierrokset(projekti, kielet, oid);
      await this.indexKuulutusJulkaisut(
        kielet,
        oid,
        projekti.lyhytOsoite ?? undefined,
        projekti.nahtavillaoloVaihe,
        linkNahtavillaOlo,
        "nahtavillaoloVaihe",
        "ui-otsikot.kuulutus_suunnitelman_nahtaville_asettamisesta"
      );
      await this.indexKuulutusJulkaisut(
        kielet,
        oid,
        projekti.lyhytOsoite ?? undefined,
        projekti.hyvaksymisPaatosVaihe,
        linkHyvaksymisPaatos,
        "hyvaksymisPaatos",
        "ui-otsikot.kuulutus_suunnitelman_hyvaksymispaatoksesta"
      );
      await this.indexKuulutusJulkaisut(
        kielet,
        oid,
        projekti.lyhytOsoite ?? undefined,
        projekti.jatkoPaatos1Vaihe,
        linkJatkoPaatos1,
        "jatkopaatos1",
        "ui-otsikot.kuulutus_jatkopaatoksesta"
      );
      await this.indexKuulutusJulkaisut(
        kielet,
        oid,
        projekti.lyhytOsoite ?? undefined,
        projekti.jatkoPaatos2Vaihe,
        linkJatkoPaatos2,
        "jatkopaatos2",
        "ui-otsikot.kuulutus_jatkopaatoksesta"
      );
    } catch (e) {
      log.error("IlmoitustauluSyoteService.index failed.", { projekti });
      log.error(e);
    }
  }

  private async indexKuulutusJulkaisut(
    kielet: Kieli[],
    oid: string,
    lyhytOsoite: string | undefined,
    julkaisu: GenericKuulutusJulkaisuJulkinen | null | undefined,
    julkaisuLink: JulkinenLinkFunction,
    julkaisuVaihe: JulkaisuVaiheIndexPart,
    uiOtsikkoPath: string
  ) {
    if (julkaisu?.tila == KuulutusJulkaisuTila.HYVAKSYTTY) {
      for (const kieli of kielet) {
        await openSearchClientIlmoitustauluSyote.putDocument(
          ilmoitusKuulutusAdapter.createKeyForJulkaisu(oid, julkaisuVaihe, julkaisu.kuulutusPaiva, kieli),
          ilmoitusKuulutusAdapter.adaptKuulutusJulkaisu(oid, julkaisuLink({ oid, lyhytOsoite }, kieli), julkaisu, kieli, uiOtsikkoPath)
        );
      }
    }
  }

  private async indexVuorovaikutusKierrokset(projekti: ProjektiJulkinen, kielet: Kieli[], oid: string) {
    if (projekti.vuorovaikutukset && projekti.vuorovaikutukset.tila === VuorovaikutusKierrosTila.JULKINEN) {
      for (const kieli of kielet) {
        await openSearchClientIlmoitustauluSyote.putDocument(
          ilmoitusKuulutusAdapter.createKeyForJulkaisu(
            oid,
            "vuorovaikutuskierros",
            projekti.vuorovaikutukset.vuorovaikutusJulkaisuPaiva,
            kieli
          ),
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

    const hits = searchResult?.hits?.hits as ProjektiDocumentHit[] | undefined;
    if (hits) {
      for (const item of hits) {
        await openSearchClientIlmoitustauluSyote.deleteDocument(item._id);
      }
    }
  }
}

export const ilmoitustauluSyoteService = new IlmoitustauluSyoteService();
