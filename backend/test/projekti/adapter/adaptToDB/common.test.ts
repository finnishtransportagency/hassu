import { describe, it } from "mocha";
import { adaptAineistotToSave, pickAineistoFromInputByDocumenttiOid } from "../../../../src/projekti/adapter/adaptToDB";
import * as API from "../../../../../common/graphql/apiModel";
import { AineistoTila } from "../../../../../common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../../../../src/projekti/adapter/projektiAdaptationResult";
import { ProjektiFixture } from "../../../fixture/projektiFixture";
import { Aineisto } from "../../../../src/database/model";

const { expect } = require("chai");

function createValmisInput(nimi?: string, id?: string): API.AineistoInput {
  return { dokumenttiOid: id || "1", tila: AineistoTila.VALMIS, nimi: "foo" + (nimi || "") };
}

function createTuontiInput(nimi?: string, id?: string): API.AineistoInput {
  return { dokumenttiOid: id || "1", tila: AineistoTila.ODOTTAA_TUONTIA, nimi: "foo" + (nimi || "") };
}

function createPoistoInput(nimi?: string, id?: string): API.AineistoInput {
  return { dokumenttiOid: id || "1", tila: AineistoTila.ODOTTAA_POISTOA, nimi: "foo" + (nimi || "") };
}

function poistoInput(id: number, nimi?: string): API.AineistoInput {
  return { dokumenttiOid: `${id}`, tila: AineistoTila.ODOTTAA_POISTOA, nimi: "foo" + (nimi || "") };
}

function poisto(id: number, nimi?: string): Aineisto {
  return { dokumenttiOid: `${id}`, tila: AineistoTila.ODOTTAA_POISTOA, nimi: "foo" + (nimi || "") };
}

function valmis(id: number, nimi?: string): Aineisto {
  return { dokumenttiOid: `${id}`, tila: AineistoTila.VALMIS, nimi: "foo" + (nimi || "") };
}

function valmisUusi(id: number): Aineisto {
  return valmis(id, "_uusi");
}

function tuonti(id: number, nimi?: string): Aineisto {
  return { dokumenttiOid: `${id}`, tila: AineistoTila.ODOTTAA_TUONTIA, nimi: "foo" + (nimi || "") };
}

function tuontiUusi(id: number): Aineisto {
  return tuonti(id, "_uusi");
}

function doTest(dbAineisto: Aineisto[], inputAineisto: API.AineistoInput[], resultAineisto: Aineisto[]) {
  let result = adaptAineistotToSave(dbAineisto, inputAineisto, new ProjektiAdaptationResult(new ProjektiFixture().dbProjekti1()));
  result = JSON.parse(JSON.stringify(result)); // Poista undefined-kentät
  expect(result).to.eql(resultAineisto);
}

describe("adaptToDB common", () => {
  it("pick aineisto pending deletion first", () => {
    // Aina pitää tulla lopputuloksen "poisto", koska se on se jonka pitää vaikuttaa
    expect(pickAineistoFromInputByDocumenttiOid([createPoistoInput(), createValmisInput(), createTuontiInput()], "1")?.tila).to.eq(
      AineistoTila.ODOTTAA_POISTOA
    );
    expect(pickAineistoFromInputByDocumenttiOid([createValmisInput(), createTuontiInput(), createPoistoInput()], "1")?.tila).to.eq(
      AineistoTila.ODOTTAA_POISTOA
    );
  });

  it("poistetaan aineistot onnistuneesti", () => {
    doTest([], [poistoInput(1)], []);
    doTest([poisto(1)], [], [poisto(1)]);
    doTest([poisto(1)], [poistoInput(1)], [poisto(1)]);
    doTest([valmis(1)], [poistoInput(1)], [poisto(1)]);
    doTest([tuonti(1)], [poistoInput(1)], [poisto(1)]);
    doTest([valmis(1), tuonti(1)], [poistoInput(1)], [poisto(1)]);
    doTest([valmis(1), poisto(1), tuonti(1)], [poistoInput(1)], [poisto(1)]);
  });

  it("poistetaan aineistot onnistuneesti", () => {
    doTest([], [poistoInput(1)], []);
    doTest([poisto(1)], [], [poisto(1)]);
    doTest([poisto(1)], [poistoInput(1)], [poisto(1)]);
    doTest([valmis(1)], [poistoInput(1)], [poisto(1)]);
    doTest([tuonti(1)], [poistoInput(1)], [poisto(1)]);
    doTest([valmis(1), tuonti(1)], [poistoInput(1)], [poisto(1)]);
    doTest([valmis(1), poisto(1), tuonti(1)], [poistoInput(1)], [poisto(1)]);
  });

  it("tuodaan ja päivitetään aineistot onnistuneesti", () => {
    doTest([valmis(1)], [tuonti(1)], [valmis(1)]);
    doTest([valmis(1)], [valmisUusi(1)], [poisto(1), tuontiUusi(1)]);
    doTest([valmis(1)], [], [valmis(1)]);
  });

  it("tuodaan ja päivitetään aineistot onnistuneesti 2", () => {
    doTest([valmis(1), valmis(2), valmis(3)], [valmisUusi(2)], [valmis(1), poisto(2), tuontiUusi(2), valmis(3)]);
    doTest([valmis(1), valmis(2), valmis(3)], [valmisUusi(2), valmis(4)], [valmis(1), poisto(2), tuontiUusi(2), valmis(3), tuonti(4)]);
    doTest(
      [
        valmis(1),
        poisto(2), //odottaa poistoa
        tuontiUusi(2), //odottaa tuontia
        valmis(3),
        tuonti(4),
      ],
      [valmisUusi(2), valmis(4)],
      [valmis(1), poisto(2), tuontiUusi(2), valmis(3), tuonti(4)]
    );
  });
});
