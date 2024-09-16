import { ProjektiAdaptationResult, ProjektiEventType } from "../../../../src/projekti/adapter/projektiAdaptationResult";
import { DBProjekti, LausuntoPyynto } from "../../../../src/database/model";
import { expect } from "chai";
import { adaptLausuntoPyynnotToSave } from "../../../../src/projekti/adapter/adaptToDB/adaptLausuntoPyynnotToSave";
import { LadattuTiedostoTila, LausuntoPyyntoInput } from "hassu-common/graphql/apiModel";

describe("adaptLausuntoPyynnotToSave", () => {
  it("should not trigger lausuntopyynnot zipping if dbLausuntopyynnot is defined and input doesn't not have lisaaineisto", async () => {
    const dummyProjekti: DBProjekti = {
      oid: "123",
      versio: 0,
      kayttoOikeudet: [],
    };
    const projektiAdaptationResult = new ProjektiAdaptationResult(dummyProjekti);

    const poistumisPaiva = "01-01-2020";
    const uuid = "123";
    const lisaAineistot: never[] = [];
    const muistiinpano = "Muistiinpano";
    const lausuntopyynto: LausuntoPyynto = { poistumisPaiva, uuid, lisaAineistot, muistiinpano };
    const lausuntopyyntoInput: LausuntoPyyntoInput = { poistumisPaiva, uuid, lisaAineistot, muistiinpano };
    adaptLausuntoPyynnotToSave([lausuntopyynto], [lausuntopyyntoInput], projektiAdaptationResult);
    expect(projektiAdaptationResult["events"].some((event) => event.eventType === ProjektiEventType.ZIP_LAUSUNTOPYYNNOT)).to.be.false;
  });

  it("should not trigger lausuntopyynnot zipping if dbLausuntopyynnot is undefined and input has lisaaineisto", async () => {
    const dummyProjekti: DBProjekti = {
      oid: "123",
      versio: 0,
      kayttoOikeudet: [],
    };
    const projektiAdaptationResult = new ProjektiAdaptationResult(dummyProjekti);
    adaptLausuntoPyynnotToSave(
      undefined,
      [
        {
          poistumisPaiva: "01-01-2020",
          uuid: "123",
          lisaAineistot: [{ nimi: "tiedostonimi", tiedosto: "tiedostopolku.txt", tila: LadattuTiedostoTila.VALMIS, uuid: "uuid123" }],
          muistiinpano: "Muistiinpano",
        },
      ],
      projektiAdaptationResult
    );
    expect(projektiAdaptationResult["events"].some((event) => event.eventType === ProjektiEventType.ZIP_LAUSUNTOPYYNNOT)).to.be.false;
  });

  it("should trigger lausuntopyynnot zipping if dbLausuntopyynnot is undefined and input doesn't not have lisaaineisto", async () => {
    const dummyProjekti: DBProjekti = {
      oid: "123",
      versio: 0,
      kayttoOikeudet: [],
    };
    const projektiAdaptationResult = new ProjektiAdaptationResult(dummyProjekti);
    adaptLausuntoPyynnotToSave(
      undefined,
      [{ poistumisPaiva: "01-01-2020", uuid: "123", lisaAineistot: [], muistiinpano: "Muistiinpano" }],
      projektiAdaptationResult
    );
    expect(projektiAdaptationResult["events"].some((event) => event.eventType === ProjektiEventType.ZIP_LAUSUNTOPYYNNOT)).to.be.true;
  });
});
