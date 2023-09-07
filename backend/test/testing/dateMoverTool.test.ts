import { describe, it } from "mocha";
import { expect } from "chai";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { siirraProjektinAikaa } from "../../src/testing/dateMoverTool";

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
});
