import { describe, it } from "mocha";
import { emailClient } from "../../src/email/email";
import { AsiakirjaTyyppi, Kieli, ProjektiTyyppi, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { AsiakirjaService } from "../../src/asiakirja/asiakirjaService";
import { asiakirjaAdapter } from "../../src/handler/asiakirjaAdapter";
import { DBProjekti } from "../../src/database/model";
import { kuntametadata } from "hassu-common/kuntametadata";
import { getLinkkiAsianhallintaan } from "../../src/asianhallinta/getLinkkiAsianhallintaan";
import { isProjektiAsianhallintaIntegrationEnabled } from "../../src/util/isProjektiAsianhallintaIntegrationEnabled";

describe.skip("Email", () => {
  it("should send test email successfully", async function () {
    const projekti: DBProjekti = {
      velho: {
        nimi: "Valtatie 11 parantaminen välillä Murhasaari–Mustikkakangas",
        kunnat: kuntametadata.idsForKuntaNames(["Nokia"]),
        tyyppi: ProjektiTyyppi.TIE,
        asiatunnusVayla: "ABC123",
        suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      },
      kielitiedot: { ensisijainenKieli: Kieli.SUOMI },
      oid: "123",
      versio: 1,
      aloitusKuulutus: {
        id: 1,
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
      oid: projekti.oid,
      lyhytOsoite: "ABCD",
      aloitusKuulutusJulkaisu: await asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti),
      asiakirjaTyyppi: AsiakirjaTyyppi.ALOITUSKUULUTUS,
      kieli: Kieli.SUOMI,
      luonnos: false,
      kayttoOikeudet: projekti.kayttoOikeudet,
      asianhallintaPaalla: await isProjektiAsianhallintaIntegrationEnabled(projekti),
      linkkiAsianhallintaan: await getLinkkiAsianhallintaan(projekti),
    });

    await emailClient.sendTurvapostiEmail({
      to: "mikko.haapamaki@cgi.com",
      subject: "TurvapostiOtsikkoa tässä",
      text: "Hei!\nToinen rivi tässä myös.",
      attachments: [{ filename: pdf.nimi, content: pdf.sisalto, encoding: "base64" }],
    });
  });
});
