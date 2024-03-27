import { expect } from "chai";
import getTiedostotKeepReference from "../../src/HyvaksymisEsitys/getTiedostotKeepReference";
import TEST_HYVAKSYMISESITYS from "./TEST_HYVAKSYMISESITYS";
import * as API from "hassu-common/graphql/apiModel";
import cloneDeep from "lodash/cloneDeep";

describe("getTiedostotKeepReference", () => {
  it("palauttaa ladatut tiedostot ja aineistot siten, että referenssi parametrina annettuun hyväksymisesitykseen säilyy", async () => {
    const hyvaksymisEsitys = cloneDeep(TEST_HYVAKSYMISESITYS);
    expect(hyvaksymisEsitys.suunnitelma?.[0]?.tila).to.eql(API.AineistoTila.VALMIS);
    expect(hyvaksymisEsitys.muistutukset?.[0]?.tila).to.eql(API.AineistoTila.VALMIS);
    const { aineistot, ladatutTiedostot } = getTiedostotKeepReference(hyvaksymisEsitys);
    aineistot.forEach((aineisto) => (aineisto.tila = API.AineistoTila.POISTETTU));
    ladatutTiedostot.forEach((ladattuTiedosto) => (ladattuTiedosto.tila = API.LadattuTiedostoTila.POISTETTU));
    expect(hyvaksymisEsitys.suunnitelma?.[0]?.tila).to.eql(API.AineistoTila.POISTETTU);
    expect(hyvaksymisEsitys.muistutukset?.[0]?.tila).to.eql(API.AineistoTila.POISTETTU);
  });
});
