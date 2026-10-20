// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import { expect } from "chai";
import * as API from "hassu-common/graphql/apiModel";
import { adaptProjektiToJulkinenIndex } from "../../src/projektiSearch/projektiSearchAdapter";
import { Kieli } from "hassu-common/graphql/apiModel";

const toiminnallinenProjektiJulkinen: API.ProjektiJulkinen = {
  __typename: "ProjektiJulkinen",
  oid: "1.2.246.578.5.1.2978288874.2711575506",
  status: API.Status.NAHTAVILLAOLO,
  velho: {
    __typename: "VelhoJulkinen",
    nimi: "Testi toiminnallinen projekti",
    tyyppi: API.ProjektiTyyppi.TOIMINNALLINEN,
  },
  nahtavillaoloVaihe: {
    __typename: "NahtavillaoloVaiheJulkaisuJulkinen",
    id: 1,
    tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
    kuulutusPaiva: "2024-01-01",
    kuulutusVaihePaattyyPaiva: "2099-01-01",
    velho: { __typename: "VelhoJulkinen", nimi: "Testi toiminnallinen projekti" },
    kielitiedot: { __typename: "Kielitiedot", ensisijainenKieli: Kieli.SUOMI },
    hankkeenKuvaus: { __typename: "LokalisoituTeksti", SUOMI: "Hankkeen kuvaus suomeksi" },
    yhteystiedot: [],
  },
};

describe("adaptProjektiToJulkinenIndex", () => {
  describe("TOIMINNALLINEN projekti", () => {
    it("should index projekti using nahtavillaolo data when no aloituskuulutus exists", () => {
      // Regression test: toiminnallinen projekti was not indexed because getBaseDataForIndexing
      // only handled vuorovaikutukset and aloitusKuulutusJulkaisu, leaving nimi as undefined.
      const result = adaptProjektiToJulkinenIndex(toiminnallinenProjektiJulkinen, Kieli.SUOMI);
      expect(result).to.not.be.undefined;
      expect(result?.nimi).to.eql("Testi toiminnallinen projekti");
      expect(result?.hankkeenKuvaus).to.eql("Hankkeen kuvaus suomeksi");
      expect(result?.publishTimestamp).to.not.be.undefined;
    });

    it("should return undefined when nahtavillaolo kuulutusPaiva is missing", () => {
      const projektiWithoutKuulutusPaiva: API.ProjektiJulkinen = {
        ...toiminnallinenProjektiJulkinen,
        nahtavillaoloVaihe: {
          ...toiminnallinenProjektiJulkinen.nahtavillaoloVaihe!,
          kuulutusPaiva: null,
        },
      };
      const result = adaptProjektiToJulkinenIndex(projektiWithoutKuulutusPaiva, Kieli.SUOMI);
      expect(result).to.be.undefined;
    });
  });
});
