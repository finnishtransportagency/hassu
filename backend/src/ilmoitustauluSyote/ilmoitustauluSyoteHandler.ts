import { Kieli } from "hassu-common/graphql/apiModel";
import RSS from "rss";
import { openSearchClientIlmoitustauluSyote } from "../projektiSearch/openSearchClientIlmoitustauluSyote";
import { IlmoitusKuulutus } from "./ilmoitusKuulutus";
import { translate } from "../util/localization";
import { kuntametadata } from "hassu-common/kuntametadata";
import { log } from "../logger";
import { NotFoundError } from "hassu-common/error";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { ProjektiDocumentHit } from "../projektiSearch/projektiSearchAdapter";

class IlmoitustauluSyoteHandler {
  async getFeed(
    kieli: KaannettavaKieli,
    ely: string | undefined,
    lely: string | undefined,
    elinvoimakeskus: string | undefined,
    maakunta: string | undefined
  ): Promise<string> {
    const siteUrl = process.env.FRONTEND_DOMAIN_NAME ?? "";
    const feed_url = siteUrl + "/api/kuulutukset";
    const feed = new RSS({ feed_url, site_url: siteUrl, title: "Kuulutukset" });

    const hits = await this.searchProjects(kieli, ely, lely, elinvoimakeskus, maakunta);

    if (hits) {
      for (const item of hits) {
        const kuulutus = item._source as IlmoitusKuulutus;
        const categories = this.getCategories(kuulutus);
        const date = kuulutus.date;
        const description = "";
        const title = kuulutus.title;
        const url = kuulutus.url;
        feed.item({ guid: item._id, categories, date, description, title, url });
      }
    }
    return feed.xml({ indent: true });
  }

  private async searchProjects(
    kieli: KaannettavaKieli,
    ely: string | undefined,
    lely: string | undefined,
    elinvoimakeskus: string | undefined,
    maakunta: string | undefined
  ): Promise<ProjektiDocumentHit[] | undefined> {
    const terms: unknown[] =
      kieli === Kieli.SUOMI
        ? [
            {
              terms: { "kieli.keyword": [kieli, Kieli.POHJOISSAAME] },
            },
          ]
        : [
            {
              term: { "kieli.keyword": kieli },
            },
          ];
    const elyId = ely ? kuntametadata.elyIdFromKey(ely) : undefined;
    if (ely) {
      if (elyId) {
        terms.push({
          term: { "elyt.keyword": elyId },
        });
      } else {
        throw new NotFoundError("ELY " + ely + " on tuntematon");
      }
    }

    const lelyId = lely ? kuntametadata.elyIdFromKey(lely) : undefined;
    if (lely) {
      if (lelyId) {
        terms.push({
          term: { "lelyt.keyword": lelyId },
        });
      } else {
        throw new NotFoundError("Liikenne-ELY " + lely + " on tuntematon");
      }
    }

    const elinvoimakeskusId = elinvoimakeskus ? kuntametadata.elinvoimakeskusIdFromKey(elinvoimakeskus) : undefined;
    if (elinvoimakeskus) {
      if (elinvoimakeskusId) {
        terms.push({
          term: { "elinvoimakeskukset.keyword": elinvoimakeskusId },
        });
      } else {
        throw new NotFoundError("Elinvoimakeskus " + elinvoimakeskus + " on tuntematon");
      }
    }

    if (maakunta) {
      try {
        const maakuntaId = kuntametadata.idForMaakuntaName(maakunta);
        terms.push({
          term: { maakunnat: maakuntaId },
        });
      } catch (e) {
        log.warn(e);
        throw new NotFoundError("Maakunta " + maakunta + " on tuntematon");
      }
    }
    const searchResult = await openSearchClientIlmoitustauluSyote.query({
      query: {
        bool: {
          must: terms,
        },
      },
      sort: [{ date: { order: "desc" } }],
    });
    const hits = searchResult.hits?.hits as ProjektiDocumentHit[] | undefined;

    return hits;
  }

  public getCategories(item: IlmoitusKuulutus) {
    const categories: string[] = ["Kuulutukset ja ilmoitukset:Kuulutus"];
    item.kunnat?.forEach((kuntaId) => {
      const kunta = kuntametadata.nameForKuntaId(kuntaId, Kieli.SUOMI);
      categories.push("Kunta:" + kunta);
    });
    item.maakunnat?.forEach((maakuntaId) => {
      const maakunta = kuntametadata.nameForMaakuntaId(maakuntaId, Kieli.SUOMI);
      categories.push("Maakunta:" + maakunta);
    });
    item.vaylamuoto?.forEach((vaylamuoto) => {
      const translatedVaylamuoto = translate("projekti-vayla-muoto." + vaylamuoto, Kieli.SUOMI);
      if (translatedVaylamuoto) {
        categories.push("Väylämuoto:" + translatedVaylamuoto);
      }
    });
    return categories;
  }
}

export const ilmoitustauluSyoteHandler = new IlmoitustauluSyoteHandler();
