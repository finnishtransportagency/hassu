/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { emailClient } from "../../src/email/email";
import { AsiakirjaTyyppi, Kieli } from "../../../common/graphql/apiModel";
import { AsiakirjaService } from "../../src/asiakirja/asiakirjaService";
import { asiakirjaAdapter } from "../../src/handler/asiakirjaAdapter";
import { DBProjekti } from "../../src/database/model";
import { kuntametadata } from "../../../common/kuntametadata";

describe.skip("Email", () => {
  it("should send test email successfully", async function () {
    const projekti: DBProjekti = {
      velho: {
        nimi: "Valtatie 11 parantaminen välillä Murhasaari–Mustikkakangas",
        kunnat: kuntametadata.idsForKuntaNames(["Nokia"]),
      },
      oid: "123",
      aloitusKuulutus: {
        kuulutusPaiva: "2022-01-01",
        hankkeenKuvaus: {
          SUOMI:
            "Tiesuunnitelmassa valtatieosuudelle suunnitellaan keskikaiteellinen ohituskaista ja eritasoliittymä. Niiden lisäksi suunnitelmaan sisältyy yksityistiejärjestelyitä. Ohituskaistaosuudelta tiealuetta levennetään, suljetaan liittymiä ja rakennetaan riista- aitaa. Suunnitteluratkaisut parantavat valtatieliikenteen sujuvuutta ja liikenneturvallisuutta.\n\n" +
            "Kuulutus on julkaistu tietoverkossa ELY- keskuksen verkkosivuilla 21.10.2020 https://www.ely-keskus.fi/web/ely/kuulutukset.",
        },
      },
      kayttoOikeudet: [],
    };
    const pdf = await new AsiakirjaService().createAloituskuulutusPdf({
      aloitusKuulutusJulkaisu: asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti),
      asiakirjaTyyppi: AsiakirjaTyyppi.ALOITUSKUULUTUS,
      kieli: Kieli.SUOMI,
      luonnos: false,
      kayttoOikeudet: projekti.kayttoOikeudet,
    });

    await emailClient.sendEmail({
      to: "mikko.haapamaki@cgi.com",
      subject: "Otsikkoa tässä",
      text: "Hei!\nToinen rivi tässä myös.",
      attachments: [{ filename: pdf.nimi, content: pdf.sisalto, encoding: "base64" }],
    });
  });
});
