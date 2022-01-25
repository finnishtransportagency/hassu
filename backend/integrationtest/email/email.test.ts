/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { sendEmail } from "../../src/email/email";
import { KuulutusService } from "../../src/kuulutus/kuulutusService";
import { KuulutusTyyppi } from "../../../common/graphql/apiModel";

describe.skip("Email", () => {
  it("should send test email successfully", async function () {
    const pdf = await new KuulutusService().createPDF(
      {
        velho: {
          nimi: "Valtatie 11 parantaminen välillä Murhasaari–Mustikkakangas",
          kunnat: ["Nokia"],
        },
        oid: "123",
        aloitusKuulutus: {
          elyKeskus: "Pirkanmaan",
          kuulutusPaiva: "2022-01-01",
          hankkeenKuvaus:
            "Tiesuunnitelmassa valtatieosuudelle suunnitellaan keskikaiteellinen ohituskaista ja eritasoliittymä. Niiden lisäksi suunnitelmaan sisältyy yksityistiejärjestelyitä. Ohituskaistaosuudelta tiealuetta levennetään, suljetaan liittymiä ja rakennetaan riista- aitaa. Suunnitteluratkaisut parantavat valtatieliikenteen sujuvuutta ja liikenneturvallisuutta.\n\n" +
            "Kuulutus on julkaistu tietoverkossa ELY- keskuksen verkkosivuilla 21.10.2020 https://www.ely-keskus.fi/web/ely/kuulutukset.",
        },
        kayttoOikeudet: [],
      },
      KuulutusTyyppi.ALOITUSKUULUTUS
    );

    await sendEmail({
      to: "mikko.haapamaki@cgi.com",
      subject: "Otsikkoa tässä",
      text: "Hei!\nToinen rivi tässä myös.",
      attachments: [{ filename: pdf.nimi, content: pdf.sisalto, encoding: "base64" }],
    });
  });
});
