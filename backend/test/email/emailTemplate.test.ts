import { describe, it } from "mocha";
import { KayttajaTyyppi, Viranomainen } from "../../../common/graphql/apiModel";
import { config } from "../../src/config";
import { createPerustamisEmail } from "../../src/email/emailTemplates";

const { expect } = require("chai");

const domain = config.frontendDomainName;

describe("EmailTemplating", () => {
  it("should create valid emailoptions", async () => {
    const emailOptions = await createPerustamisEmail({
      oid: "1.2.246.578.5.1.165",
      versio: 1,
      velho: {
        asiatunnusVayla: "VAYLA/8591/03.04.02.00/2014",
        asiatunnusELY: "ELY/8591/03.04.02.00/2014",
        nimi: "Maantien 16909 (Isoahontie) kevyen liikenteen väylä välillä valtatie 4 - Petäjätie, Viitasaari",
        vastuuhenkilonEmail: "veikko.vaylalainen@vayla.fi",
        suunnittelustaVastaavaViranomainen: Viranomainen.VAYLAVIRASTO,
      },
      kayttoOikeudet: [
        {
          kayttajatunnus: "ABC123",
          etunimi: "Veikko",
          sukunimi: "Väyläläinen",
          organisaatio: "Väylä",
          tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
          email: "veikko.vaylalainen@vayla.fi",
        },
      ],
    });
    expect(emailOptions.to).to.be.eql(["veikko.vaylalainen@vayla.fi"]);
    expect(emailOptions.subject).to.be.equal("Valtion liikenneväylien suunnittelu: Uusi projekti perustettu VAYLA/8591/03.04.02.00/2014");
    expect(emailOptions.text).to.be.equal(
      "Valtion liikenneväylien suunnittelu -järjestelmään on tuotu Projektivelhosta projektisi:\n" +
        "Maantien 16909 (Isoahontie) kevyen liikenteen väylä välillä valtatie 4 - Petäjätie, Viitasaari\n" +
        "Voit tarkastella projektia osoitteessa https://" +
        domain +
        "/yllapito/projekti/1.2.246.578.5.1.165\n" +
        "Saat tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata."
    );
  });
});
