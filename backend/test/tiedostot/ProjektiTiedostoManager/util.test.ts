import { expect } from "chai";
import { ProjektiTyyppi } from "hassu-common/graphql/apiModel";
import { getZipFolder } from "../../../src/tiedostot/ProjektiTiedostoManager/util";

describe("getZipFolder", () => {
  it("returns correct folder for 'rataan_liittyvat_toimenpiteet_tiesuunnitelmassa'", () => {
    const folder = getZipFolder("rataan_liittyvat_toimenpiteet_tiesuunnitelmassa", ProjektiTyyppi.TIE);
    expect(folder).to.eql("Pääpiirustukset/Rataan liittyvät toimenpiteet tiesuunnitelmassa/");
  });
  it("returns correct folder for 'vaikutuksia_kuvaavat_selvitykset'", () => {
    const folder = getZipFolder("vaikutuksia_kuvaavat_selvitykset", ProjektiTyyppi.TIE);
    expect(folder).to.eql("Informatiivinen aineisto/Vaikutuksia kuvaavat selvitykset/");
  });
  it("returns correct folder for 'osa_a'", () => {
    const folder = getZipFolder("osa_a", ProjektiTyyppi.TIE);
    expect(folder).to.eql("Selostusosa/");
  });
  it("returns undefined if input is undefined", () => {
    const folder = getZipFolder(undefined, ProjektiTyyppi.TIE);
    expect(folder).is.undefined;
  });
  it("returns undefined if input is null", () => {
    const folder = getZipFolder(null, ProjektiTyyppi.TIE);
    expect(folder).is.undefined;
  });
});
