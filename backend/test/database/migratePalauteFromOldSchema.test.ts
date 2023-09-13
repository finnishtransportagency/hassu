import { describe, it } from "mocha";
import { Palaute } from "../../src/database/model";
import { migrateFromOldSchema } from "../../src/database/palauteSchemaUpdate";

import { expect } from "chai";

describe("migrateFromOldSchema", () => {
  it("should convert otettuKasittelyyn to vastattu", async () => {
    const oldForm = {
      id: "86963301-4703-458f-abef-a89365f995f3",
      vastaanotettu: "2023-05-11T15:48",
      etunimi: "Irpo",
      sukunim: "Purjola",
      sahkoposti: "abc@abc.ab",
      puhelinnumero: "12334",
      kysymysTaiPalaute: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit",
      yhteydenottotapaEmail: true,
      yhteydenottotapaPuhelin: true,
      liite: "/palautteet/86963301-4703-458f-abef-a89365f995f3/abc.pdf",
      liitteenSkannausTulos: "OK",
      otettuKasittelyyn: true,
    };

    const newForm = {
      id: "86963301-4703-458f-abef-a89365f995f3",
      vastaanotettu: "2023-05-11T15:48",
      etunimi: "Irpo",
      sukunim: "Purjola",
      sahkoposti: "abc@abc.ab",
      puhelinnumero: "12334",
      kysymysTaiPalaute: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit",
      yhteydenottotapaEmail: true,
      yhteydenottotapaPuhelin: true,
      liite: "/palautteet/86963301-4703-458f-abef-a89365f995f3/abc.pdf",
      liitteenSkannausTulos: "OK",
      vastattu: true,
    };

    const migratoitu = migrateFromOldSchema(oldForm as any as Palaute);
    expect(migratoitu).to.eql(newForm);
  });
});
