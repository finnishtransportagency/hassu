import { LadattuTiedostoInput, LadattuTiedostoTila } from "hassu-common/graphql/apiModel";
import { adaptTiedostotToSave } from "../../../../src/projekti/adapter/adaptToDB";
import { ProjektiAdaptationResult } from "../../../../src/projekti/adapter/projektiAdaptationResult";
import { DBProjekti, LadattuTiedosto } from "../../../../src/database/model";
import { expect } from "chai";

describe("adaptTiedostotToSave", () => {
  it("should not overwrite db info with old info from FE", async () => {
    const dbTiedostot: LadattuTiedosto[] = [
      {
        tiedosto: "/lausuntopyynnon_taydennys/jotain/aineisto.txt",
        nimi: "aineisto.txt",
        tila: LadattuTiedostoTila.VALMIS,
        tuotu: "2022-01-01T01:01",
        uuid: "aineisto",
        jarjestys: 1,
      },
    ];
    const input: LadattuTiedostoInput[] = [
      {
        tiedosto: "3246346346/aineisto.txt",
        nimi: "aineisto.txt",
        tila: LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
        uuid: "aineisto",
        jarjestys: 2,
      },
    ];
    const expectedResult: LadattuTiedosto[] = [
      {
        tiedosto: "/lausuntopyynnon_taydennys/jotain/aineisto.txt",
        nimi: "aineisto.txt",
        tila: LadattuTiedostoTila.VALMIS,
        tuotu: "2022-01-01T01:01",
        uuid: "aineisto",
        jarjestys: 2,
      },
    ];
    const dummyProjekti: DBProjekti = {
      oid: "",
      versio: 0,
      kayttoOikeudet: [],
    };
    const projektiAdaptationResult = new ProjektiAdaptationResult(dummyProjekti);
    const actualResult = adaptTiedostotToSave(dbTiedostot, input, projektiAdaptationResult);
    expect(actualResult).to.eql(expectedResult);
  });

  it("should be able to delete even with old tiedosto info", async () => {
    const dbTiedostot: LadattuTiedosto[] = [
      {
        tiedosto: "/lausuntopyynnon_taydennys/jotain/aineisto.txt",
        nimi: "aineisto.txt",
        tila: LadattuTiedostoTila.VALMIS,
        tuotu: "2022-01-01T01:01",
        uuid: "aineisto",
        jarjestys: 1,
      },
    ];
    const input: LadattuTiedostoInput[] = [
      {
        tiedosto: "3246346346/aineisto.txt",
        nimi: "aineisto.txt",
        tila: LadattuTiedostoTila.ODOTTAA_POISTOA,
        uuid: "aineisto",
        jarjestys: 1,
      },
    ];
    const expectedResult: LadattuTiedosto[] = [
      {
        tiedosto: "/lausuntopyynnon_taydennys/jotain/aineisto.txt",
        nimi: "aineisto.txt",
        tila: LadattuTiedostoTila.ODOTTAA_POISTOA,
        tuotu: "2022-01-01T01:01",
        uuid: "aineisto",
        jarjestys: 1,
      },
    ];
    const dummyProjekti: DBProjekti = {
      oid: "",
      versio: 0,
      kayttoOikeudet: [],
    };
    const projektiAdaptationResult = new ProjektiAdaptationResult(dummyProjekti);
    const actualResult = adaptTiedostotToSave(dbTiedostot, input, projektiAdaptationResult);
    expect(actualResult).to.eql(expectedResult);
  });
});
