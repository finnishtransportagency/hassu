import { describe, it } from "mocha";
import { adaptAineistotToSave, pickAineistoFromInputByDocumenttiOid } from "../../../../src/projekti/adapter/adaptToDB";
import { AineistoTila } from "../../../../../common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../../../../src/projekti/adapter/projektiAdaptationResult";
import { ProjektiFixture } from "../../../fixture/projektiFixture";

const { expect } = require("chai");

function createValmisInput(nimi?: string, id?: string) {
  return { dokumenttiOid: id || "1", tila: AineistoTila.VALMIS, nimi: "foo" + (nimi || "") };
}

function createTuontiInput(nimi?: string, id?: string) {
  return { dokumenttiOid: id || "1", tila: AineistoTila.ODOTTAA_TUONTIA, nimi: "foo" + (nimi || "") };
}

function createPoistoInput(nimi?: string, id?: string) {
  return { dokumenttiOid: id || "1", tila: AineistoTila.ODOTTAA_POISTOA, nimi: "foo" + (nimi || "") };
}

const POISTO = 1;
const VALMIS = 2;
const TUONTI = 3;
const POISTO_UUSI_NIMI = 4;
const VALMIS_UUSI_NIMI = 5;
const TUONTI_UUSI_NIMI = 6;

function numbersToInputAineisto(numbers: [number, string | undefined][]) {
  return numbers.map((n) => {
    switch (n[0]) {
      case POISTO:
        return { dokumenttiOid: n[1] || "1", tila: AineistoTila.ODOTTAA_POISTOA, nimi: "foo" };
      case POISTO_UUSI_NIMI:
        return { dokumenttiOid: n[1] || "1", tila: AineistoTila.ODOTTAA_POISTOA, nimi: "foo_uusi" };
      case VALMIS:
      case TUONTI:
        return { dokumenttiOid: n[1] || "1", nimi: "foo" };
      case VALMIS_UUSI_NIMI:
      case TUONTI_UUSI_NIMI:
        return { dokumenttiOid: n[1] || "1", nimi: "foo_uusi" };
      default:
        throw Error("A bug");
    }
  });
}

function numbersToAineisto(numbers: [number, string | undefined][]) {
  return numbers.map((n) => {
    switch (n[0]) {
      case POISTO:
        return createPoistoInput("", n[1]);
      case POISTO_UUSI_NIMI:
        return createPoistoInput("_uusi", n[1]);
      case VALMIS:
        return createValmisInput("", n[1]);
      case VALMIS_UUSI_NIMI:
        return createValmisInput("_uusi", n[1]);
      case TUONTI:
        return createTuontiInput("", n[1]);
      case TUONTI_UUSI_NIMI:
        return createTuontiInput("_uusi", n[1]);
      default:
        throw Error("A bug");
    }
  });
}

function doTest(
  dbAineisto: [number, string | undefined][],
  inputAineisto: [number, string | undefined][],
  resultAineisto: [number, string | undefined][]
) {
  let result = adaptAineistotToSave(
    numbersToAineisto(dbAineisto),
    numbersToInputAineisto(inputAineisto),
    new ProjektiAdaptationResult(new ProjektiFixture().dbProjekti1())
  );
  result = JSON.parse(JSON.stringify(result)); // Poista undefined-kentät
  expect(result).to.eql(numbersToAineisto(resultAineisto));
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
    doTest([], [[POISTO, "1"]], []);
    doTest([[POISTO, "1"]], [], [[POISTO, "1"]]);
    doTest([[POISTO, "1"]], [[POISTO, "1"]], [[POISTO, "1"]]);
    doTest([[VALMIS, "1"]], [[POISTO, "1"]], [[POISTO, "1"]]);
    doTest([[TUONTI, "1"]], [[POISTO, "1"]], [[POISTO, "1"]]);
    doTest(
      [
        [VALMIS, "1"],
        [TUONTI, "1"],
      ],
      [[POISTO, "1"]],
      [
        [POISTO, "1"],
        [POISTO, "1"],
      ]
    );
    doTest(
      [
        [VALMIS, "1"],
        [POISTO, "1"],
        [TUONTI, "1"],
      ],
      [[POISTO, "1"]],
      [
        [POISTO, "1"],
        [POISTO, "1"],
        [POISTO, "1"],
      ]
    );
  });

  it("poistetaan aineistot onnistuneesti", () => {
    doTest([], [[POISTO, "1"]], []);
    doTest([[POISTO, "1"]], [], [[POISTO, "1"]]);
    doTest([[POISTO, "1"]], [[POISTO, "1"]], [[POISTO, "1"]]);
    doTest([[VALMIS, "1"]], [[POISTO, "1"]], [[POISTO, "1"]]);
    doTest([[TUONTI, "1"]], [[POISTO, "1"]], [[POISTO, "1"]]);
    doTest(
      [
        [VALMIS, "1"],
        [TUONTI, "1"],
      ],
      [[POISTO, "1"]],
      [
        [POISTO, "1"],
        [POISTO, "1"],
      ]
    );
    doTest(
      [
        [VALMIS, "1"],
        [POISTO, "1"],
        [TUONTI, "1"],
      ],
      [[POISTO, "1"]],
      [
        [POISTO, "1"],
        [POISTO, "1"],
        [POISTO, "1"],
      ]
    );
  });

  it("tuodaan ja päivitetään aineistot onnistuneesti", () => {
    doTest([[VALMIS, "1"]], [[TUONTI, "1"]], [[VALMIS, "1"]]);
    doTest(
      [[VALMIS, "1"]],
      [[VALMIS_UUSI_NIMI, "1"]],
      [
        [POISTO, "1"],
        [TUONTI_UUSI_NIMI, "1"],
      ]
    );
    doTest([[VALMIS, "1"]], [], [[VALMIS, "1"]]);
  });

  it("tuodaan ja päivitetään aineistot onnistuneesti 2", () => {
    doTest(
      [
        [VALMIS, "1"],
        [VALMIS, "2"],
        [VALMIS, "3"],
      ],
      [[VALMIS_UUSI_NIMI, "2"]],
      [
        [VALMIS, "1"],
        [POISTO, "2"],
        [TUONTI_UUSI_NIMI, "2"],
        [VALMIS, "3"],
      ]
    );
    doTest(
      [
        [VALMIS, "1"],
        [VALMIS, "2"],
        [VALMIS, "3"],
      ],
      [
        [VALMIS_UUSI_NIMI, "2"],
        [VALMIS, "4"],
      ],
      [
        [VALMIS, "1"],
        [POISTO, "2"],
        [TUONTI_UUSI_NIMI, "2"],
        [VALMIS, "3"],
        [TUONTI, "4"],
      ]
    );
    doTest(
      [
        [VALMIS, "1"],
        [POISTO, "2"], //odottaa poistoa
        [TUONTI_UUSI_NIMI, "2"], //odottaa tuontia
        [VALMIS, "3"],
        [TUONTI, "4"],
      ],
      [
        [VALMIS_UUSI_NIMI, "2"],
        [VALMIS, "4"],
      ],
      [
        [VALMIS, "1"],
        [POISTO, "2"],
        [TUONTI_UUSI_NIMI, "2"],
        [TUONTI_UUSI_NIMI, "2"],
        [VALMIS, "3"],
        [TUONTI, "4"],
      ]
    );
  });
});
