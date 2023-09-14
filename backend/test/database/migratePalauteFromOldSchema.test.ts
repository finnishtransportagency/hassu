import { describe, it } from "mocha";
import { Palaute } from "../../src/database/model";
import { migrateFromOldSchema } from "../../src/database/palauteSchemaUpdate";

import { expect } from "chai";

describe("migrateFromOldSchema", () => {
  it("should convert otettuKasittelyyn to vastattu", async () => {
    type OldPalaute = Omit<Palaute, "vastattu"> & { otettuKasittelyyn: boolean };
    const oldForm: OldPalaute = {
      id: "86963301-4703-458f-abef-a89365f995f3",
      vastaanotettu: "2023-05-11T15:48",
      etunimi: "Irpo",
      sukunimi: "Purjola",
      sahkoposti: "abc@abc.ab",
      puhelinnumero: "12334",
      kysymysTaiPalaute: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit",
      yhteydenottotapaEmail: true,
      yhteydenottotapaPuhelin: true,
      liite: "/palautteet/86963301-4703-458f-abef-a89365f995f3/abc.pdf",
      oid: "projekti-oid",
      otettuKasittelyyn: true,
    };

    const newForm: Palaute = {
      id: "86963301-4703-458f-abef-a89365f995f3",
      vastaanotettu: "2023-05-11T15:48",
      etunimi: "Irpo",
      sukunimi: "Purjola",
      sahkoposti: "abc@abc.ab",
      puhelinnumero: "12334",
      kysymysTaiPalaute: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit",
      yhteydenottotapaEmail: true,
      yhteydenottotapaPuhelin: true,
      liite: "/palautteet/86963301-4703-458f-abef-a89365f995f3/abc.pdf",
      oid: "projekti-oid",
      vastattu: true,
    };

    const migratoitu = migrateFromOldSchema(oldForm);
    expect(migratoitu).to.eql(newForm);
  });
});
