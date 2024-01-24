import { describe, it } from "mocha";
import { adaptAineistotToSave } from "../../../../src/projekti/adapter/adaptToDB";
import * as API from "hassu-common/graphql/apiModel";
import { AineistoTila } from "hassu-common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../../../../src/projekti/adapter/projektiAdaptationResult";
import { ProjektiFixture } from "../../../fixture/projektiFixture";
import { Aineisto } from "../../../../src/database/model";

import { expect } from "chai";

function poistoInput(id: number, uuid?: string, nimi?: string): API.AineistoInput {
  return { dokumenttiOid: `${id}`, tila: AineistoTila.ODOTTAA_POISTOA, nimi: "foo" + (nimi || ""), uuid: uuid ?? "uuid" };
}

function poisto(id: number, uuid?: string, nimi?: string): Aineisto {
  return {
    dokumenttiOid: `${id}`,
    tila: AineistoTila.ODOTTAA_POISTOA,
    nimi: "foo" + (nimi || ""),
    tiedosto: "jotain.txt",
    tuotu: "2022-01-01T01:01",
    uuid: uuid ?? "uuid",
  };
}

function valmis(id: number, uuid?: string, nimi?: string): Aineisto {
  return {
    dokumenttiOid: `${id}`,
    tila: AineistoTila.VALMIS,
    nimi: "foo" + (nimi || ""),
    tiedosto: "jotain.txt",
    tuotu: "2022-01-01T01:01",
    uuid: uuid ?? "uuid",
  };
}

function tuonti(id: number, uuid?: string, nimi?: string): Aineisto {
  return { dokumenttiOid: `${id}`, tila: AineistoTila.ODOTTAA_TUONTIA, nimi: nimi ?? "foo", uuid: uuid ?? "uuid" };
}

function tuontiUusi(id: number, uuid?: string, nimi?: string): Aineisto {
  return tuonti(id, uuid, nimi);
}

function doTest(dbAineisto: Aineisto[], inputAineisto: API.AineistoInput[], resultAineisto: Aineisto[]) {
  let result = adaptAineistotToSave(dbAineisto, inputAineisto, new ProjektiAdaptationResult(new ProjektiFixture().dbProjekti1()));
  result = JSON.parse(JSON.stringify(result)); // Poista undefined-kentät
  expect(result).to.eql(resultAineisto);
}

describe("adaptAineistotToSave", () => {
  it("huomaa, jos jokin on jo poistettu", () => {
    doTest([], [poistoInput(1)], []);
  });

  it("huomaa, jos jokin on jo merkitty poistetuksi", () => {
    doTest([poisto(1)], [poistoInput(1)], [poisto(1)]);
  });

  it("poistaa tuodun", () => {
    doTest([valmis(1)], [poistoInput(1)], [poisto(1)]);
  });

  it("poistaa tuomista odottavan aineistoista", () => {
    doTest([tuonti(1)], [poistoInput(1)], []);
  });

  it("poistaa tuomista odottavan aineistoista, poistamatta poistoa odottavaa aineistoa", () => {
    doTest([valmis(1, "uuid1"), tuonti(1, "uuid2")], [poistoInput(1, "uuid1"), poistoInput(1, "uuid2")], [poisto(1, "uuid1")]);
  });

  it("ei hämäännyt, jos inputissa yritetään tuoda jotain, joka on taustalla tuotu jo", () => {
    doTest([valmis(1)], [tuonti(1)], [valmis(1)]);
  });

  it("päivittää onnistuneesti tiedoston", () => {
    doTest([valmis(1)], [poisto(1), tuontiUusi(1, "foo2")], [poisto(1), tuontiUusi(1, "foo2")]);
  });

  it("päivittää onnistuneesti tiedoston muuttamatta tiedostoja, joita ei haluta muuttaa", () => {
    doTest(
      [valmis(1), valmis(2, "uuid2"), valmis(3, "uuid3")],
      [valmis(1), poisto(2, "uuid2"), tuontiUusi(2, "uuid2b"), valmis(3, "uuid3")],
      [valmis(1), poisto(2, "uuid2"), tuontiUusi(2, "uuid2b"), valmis(3, "uuid3")]
    );
  });

  it("ei hämäänny, jos aineistot eivät muutu mitenkään", () => {
    doTest([valmis(1)], [valmis(1)], [valmis(1)]);
  });

  it("päivittää tiedoston ja samaan aikaan tuo uuden", () => {
    doTest(
      [valmis(1), valmis(2, "uuid3"), valmis(3, "uuid3")],
      [valmis(1), poisto(2, "uuid2"), tuontiUusi(2, "uuid2b"), valmis(3, "uuid3"), tuontiUusi(4, "uuid4")],
      [valmis(1), poisto(2, "uuid2"), tuontiUusi(2, "uuid2b"), valmis(3, "uuid3"), tuontiUusi(4, "uuid4")]
    );
  });
});
