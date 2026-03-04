import { describe, it } from "mocha";
import { expect } from "chai";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { siirraProjektinAikaa } from "../../src/testing/dateMoverTool";
import { AineistoTila } from "hassu-common/graphql/apiModel";
import assert from "assert";

describe("DateMoverTool", () => {
  it("should move dates one year to the past", async () => {
    const projekti = new ProjektiFixture().dbProjektiKaikkiVaiheetSaame();
    expect(projekti?.aloitusKuulutusJulkaisut?.[0].kuulutusPaiva).to.eq("2022-03-28");
    expect(projekti?.hyvaksymisPaatosVaihe?.aineistoNahtavilla?.[0].tuotu).to.eq("2020-01-01T00:00:00+02:00");
    siirraProjektinAikaa(projekti, 365);
    expect(projekti).toMatchSnapshot();
    expect(projekti?.aloitusKuulutusJulkaisut?.[0].kuulutusPaiva).to.eq("2021-03-28");
    expect(projekti?.hyvaksymisPaatosVaihe?.aineistoNahtavilla?.[0].tuotu).to.eq("2019-01-01T00:00:00+02:00");
  });

  it("should not change file name that doesn't include a date", async () => {
    const projekti = new ProjektiFixture().dbProjektiKaikkiVaiheetSaame();
    assert(projekti.nahtavillaoloVaiheJulkaisut?.[0]);
    const tiedostonimi = "1400-72L-6708_Yleiskartta_kmv209-216.pdf";
    projekti.nahtavillaoloVaiheJulkaisut[0].aineistoNahtavilla = [
      { dokumenttiOid: "testi.oid", nimi: tiedostonimi, tila: AineistoTila.VALMIS, uuid: "08393ada-041a-4a0f-9bc3-2d02d7fbc24b" },
    ];
    siirraProjektinAikaa(projekti, 365);
    expect(projekti.nahtavillaoloVaiheJulkaisut[0].aineistoNahtavilla[0].nimi).to.eq(tiedostonimi);
  });
});
