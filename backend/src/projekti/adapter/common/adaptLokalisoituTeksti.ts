import { LocalizedMap, RequiredLocalizedMap, Linkki } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { KaannettavaKieli } from "../../../../../common/kaannettavatKielet";

export function adaptLokalisoituTeksti(hankkeenKuvaus: LocalizedMap<string> | undefined): API.LokalisoituTeksti | undefined {
  if (hankkeenKuvaus && Object.keys(hankkeenKuvaus).length > 0) {
    return {
      __typename: "LokalisoituTeksti",
      [API.Kieli.SUOMI]: hankkeenKuvaus[API.Kieli.SUOMI] || "",
      ...hankkeenKuvaus,
    };
  }
}

export function adaptLokalisoituLinkki(linkki: RequiredLocalizedMap<Linkki> | undefined | null): API.LokalisoituLinkki | undefined {
  if (linkki && Object.keys(linkki).length > 0) {
    const lokalisoituLinkki: Partial<API.LokalisoituLinkki> = {
      __typename: "LokalisoituLinkki",
    };
    Object.keys(linkki).forEach((kieli) => {
      const singleLinkki = linkki[kieli as KaannettavaKieli];
      if (singleLinkki) {
        lokalisoituLinkki[kieli as KaannettavaKieli] = {
          __typename: "Linkki",
          nimi: singleLinkki.nimi,
          url: singleLinkki.url,
        };
      }
    });
    if (!lokalisoituLinkki[API.Kieli.SUOMI]) {
      throw new Error("adaptLokalisoituLinkki: suomenkielinen linkki puuttuu");
    }
    return lokalisoituLinkki as API.LokalisoituLinkki;
  }
}
