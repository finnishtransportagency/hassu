import { Kieli } from "../../../common/graphql/apiModel";
import RSS from "rss";
import { openSearchClientIlmoitustauluSyote } from "../projektiSearch/openSearchClient";
import { IlmoitusKuulutus } from "./ilmoitusKuulutus";
import { translate } from "../util/localization";

class IlmoitustauluSyoteHandler {
  async getFeed(kieli: Kieli): Promise<string> {
    const siteUrl = process.env.FRONTEND_DOMAIN_NAME || "";
    const feed_url = siteUrl + "/api/kuulutukset";
    const feed = new RSS({ feed_url, site_url: siteUrl, title: "Kuulutukset" });

    const searchResult = await openSearchClientIlmoitustauluSyote.query({
      query: {
        bool: {
          must: [
            {
              term: { "kieli.keyword": kieli },
            },
          ],
        },
      },
      sort: [{ date: { order: "desc" } }],
    });

    console.log(searchResult);
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
    item.kunnat?.forEach((kunta) => {
      categories.push("Kunta:" + kunta.trim());
    });
    item.maakunnat?.forEach((maakunta) => {
      categories.push("Maakunta:" + maakunta.trim());
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
