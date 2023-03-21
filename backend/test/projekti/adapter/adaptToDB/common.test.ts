import { describe, it } from "mocha";
import { adaptAineistotToSave, pickAineistoFromInputByDocumenttiOid } from "../../../../src/projekti/adapter/adaptToDB";
import { AineistoTila } from "../../../../../common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../../../../src/projekti/adapter/projektiAdaptationResult";
import { ProjektiFixture } from "../../../fixture/projektiFixture";

const { expect } = require("chai");

function createValmisInput(nimi?: string) {
  return { dokumenttiOid: "1", tila: AineistoTila.VALMIS, nimi: "foo" + (nimi || "") };
}

function createTuontiInput(nimi?: string) {
  return { dokumenttiOid: "1", tila: AineistoTila.ODOTTAA_TUONTIA, nimi: "foo" + (nimi || "") };
}

function createPoistoInput(nimi?: string) {
  return { dokumenttiOid: "1", tila: AineistoTila.ODOTTAA_POISTOA, nimi: "foo" + (nimi || "") };
}

const POISTO = 1;
const VALMIS = 2;
const TUONTI = 3;
const POISTO_UUSI_NIMI = 4;
const VALMIS_UUSI_NIMI = 5;
const TUONTI_UUSI_NIMI = 6;

function numbersToInputAineisto(numbers: number[]) {
  return numbers.map((n) => {
    switch (n) {
      case POISTO:
        return { dokumenttiOid: "1", tila: AineistoTila.ODOTTAA_POISTOA, nimi: "foo" };
      case POISTO_UUSI_NIMI:
        return { dokumenttiOid: "1", tila: AineistoTila.ODOTTAA_POISTOA, nimi: "foo_uusi" };
      case VALMIS:
      case TUONTI:
        return { dokumenttiOid: "1", nimi: "foo" };
      case VALMIS_UUSI_NIMI:
      case TUONTI_UUSI_NIMI:
        return { dokumenttiOid: "1", nimi: "foo_uusi" };
      default:
        throw Error("A bug");
    }
  });
}

function numbersToAineisto(numbers: number[]) {
  return numbers.map((n) => {
    switch (n) {
      case POISTO:
        return createPoistoInput();
      case POISTO_UUSI_NIMI:
        return createPoistoInput("_uusi");
      case VALMIS:
        return createValmisInput();
      case VALMIS_UUSI_NIMI:
        return createValmisInput("_uusi");
      case TUONTI:
        return createTuontiInput();
      case TUONTI_UUSI_NIMI:
        return createTuontiInput("_uusi");
      default:
        throw Error("A bug");
    }
  });
}

function doTest(dbAineisto: number[], inputAineisto: number[], resultAineisto: number[]) {
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
    doTest([], [POISTO], []);
    doTest([POISTO], [], [POISTO]);
    doTest([POISTO], [POISTO], [POISTO]);
    doTest([VALMIS], [POISTO], [POISTO]);
    doTest([TUONTI], [POISTO], [POISTO]);
    doTest([VALMIS, TUONTI], [POISTO], [POISTO, POISTO]);
    doTest([VALMIS, POISTO, TUONTI], [POISTO], [POISTO, POISTO, POISTO]);
  });

  it("tuodaan ja päivitetään aineistot onnistuneesti", () => {
    doTest([VALMIS], [TUONTI], [VALMIS]);
    doTest([VALMIS], [VALMIS_UUSI_NIMI], [POISTO, TUONTI_UUSI_NIMI]);
    doTest([VALMIS], [], [VALMIS]);
  });
});
