import { describe, it } from "mocha";
import { createPerustamisEmail } from "../../src/email/emailTemplates";

const { expect } = require("chai");

describe("EmailTemplating", () => {
  it("should create valid emailoptions", async () => {
    const emailOptions = await createPerustamisEmail({
      oid: "1.2.246.578.5.1.165",
      velho: {
        asiatunnusVayla: "VAYLA/8591/03.04.02.00/2014",
        nimi: "Maantien 16909 (Isoahontie) kevyen liikenteen väylä välillä valtatie 4 - Petäjätie, Viitasaari",
        vastuuhenkilonEmail: "veikko.vaylalainen@vayla.fi",
      },
      kayttoOikeudet: [],
    });
    expect(emailOptions.to).to.be.equal("veikko.vaylalainen@vayla.fi");
    expect(emailOptions.subject).to.be.equal(
      "Väylien suunnittelu: Uusi projekti perustettu VAYLA/8591/03.04.02.00/2014"
    );
    expect(emailOptions.text).to.be.equal(
      "Väylien suunnittelu -järjestelmään on tuotu Velhosta projektisi:\n" +
        "Maantien 16909 (Isoahontie) kevyen liikenteen väylä välillä valtatie 4 - Petäjätie, Viitasaari\n" +
        "Voit tarkastella projektia osoitteessa https://hassudev.testivaylapilvi.fi/yllapito/projekti/1.2.246.578.5.1.165"
    );
  });
});
