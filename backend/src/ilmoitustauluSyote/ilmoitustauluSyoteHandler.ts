import { Kieli } from "../../../common/graphql/apiModel";
import RSS from "rss";
import { openSearchClientIlmoitustauluSyote } from "../projektiSearch/openSearchClient";
import { IlmoitusKuulutus } from "./ilmoitusKuulutus";
import { translate } from "../util/localization";
import { kuntametadata } from "../../../common/kuntametadata";
import { log } from "../logger";
import { NotFoundError } from "../error/NotFoundError";
import { KaannettavaKieli } from "../../../common/kaannettavatKielet";

class IlmoitustauluSyoteHandler {
  async getFeed(kieli: KaannettavaKieli, ely: string | undefined, lely: string | undefined, maakunta: string | undefined): Promise<string> {
    const siteUrl = process.env.FRONTEND_DOMAIN_NAME || "";
    const feed_url = siteUrl + "/api/kuulutukset";
    const feed = new RSS({ feed_url, site_url: siteUrl, title: "Kuulutukset" });

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

    if (searchResult.hits?.hits) {
      for (const item of searchResult.hits?.hits) {
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
      const translatedVaylamuoto = translate("projekti.projekti-vayla-muoto." + vaylamuoto, Kieli.SUOMI);
      if (translatedVaylamuoto) {
        categories.push("Väylämuoto:" + translatedVaylamuoto);
      }
    });
    return categories;
  }
}

export const ilmoitustauluSyoteHandler = new IlmoitustauluSyoteHandler();
