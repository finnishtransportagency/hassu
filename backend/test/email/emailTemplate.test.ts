import { describe, it } from "mocha";
import { KayttajaTyyppi, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { config } from "../../src/config";
import { createPerustamisEmail, projektiPaallikkoJaVarahenkilotEmails } from "../../src/email/emailTemplates";
import { DBVaylaUser } from "../../src/database/model";

import { expect } from "chai";

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
        suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      },
      kayttoOikeudet: [
        {
          kayttajatunnus: "A123",
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
        "Maantien 16909 (Isoahontie) kevyen liikenteen väylä välillä valtatie 4 - Petäjätie, Viitasaari\n\n" +
        "Voit tarkastella projektia osoitteessa https://" +
        domain +
        "/yllapito/projekti/1.2.246.578.5.1.165\n\n" +
        "Sait tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata."
    );
  });

  it("should not send email to varahenkilo with non-A/L-tunnus (e.g. LX-tunnus)", () => {
    const kayttoOikeudet: DBVaylaUser[] = [
      {
        kayttajatunnus: "A123",
        tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
        email: "pp@vayla.fi",
        organisaatio: "Väylävirasto",
        etunimi: "Pekka",
        sukunimi: "Päällikkö",
      },
      {
        kayttajatunnus: "LX456",
        tyyppi: KayttajaTyyppi.VARAHENKILO,
        email: "konsultti@konsultti.fi",
        organisaatio: "Konsulttitoimisto",
        etunimi: "Kalle",
        sukunimi: "Konsultti",
      },
      {
        kayttajatunnus: "L789",
        tyyppi: KayttajaTyyppi.VARAHENKILO,
        email: "varahenkilo@vayla.fi",
        organisaatio: "Väylävirasto",
        etunimi: "Ville",
        sukunimi: "Varahenkilö",
      },
    ];
    const emails = projektiPaallikkoJaVarahenkilotEmails(kayttoOikeudet);
    expect(emails).to.eql(["pp@vayla.fi", "varahenkilo@vayla.fi"]);
    expect(emails).to.not.include("konsultti@konsultti.fi");
  });
});
