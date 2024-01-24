import { RequiredLocalizedMap, Linkki } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";

export function adaptLokalisoidutLinkitToAPI(
  linkit: RequiredLocalizedMap<Linkki>[] | undefined | null
): API.LokalisoituLinkki[] | undefined {
  if (linkit) {
    return linkit.map((linkki) => adaptLokalisoituLinkkiToAPI(linkki)).filter((linkki) => !!linkki) as API.LokalisoituLinkki[];
  }
  return undefined;
}

function adaptLokalisoituLinkkiToAPI(linkki: RequiredLocalizedMap<Linkki> | undefined | null): API.LokalisoituLinkki | undefined {
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
