/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import { KuulutusService } from "../../src/kuulutus/kuulutusService";
import { KuulutusTyyppi } from "../../../common/graphql/apiModel";
import fs from "fs";

const { expect } = require("chai");

describe("kuulutusService", async () => {
  it("should generate pdf succesfully", async () => {
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
    expect(pdf.sisalto.length).to.be.greaterThan(50000);
    // tslint:disable-next-line:no-unused-expression
    expect(pdf.nimi).not.to.be.empty;
    fs.mkdirSync(".report", { recursive: true });
    fs.writeFileSync(".report/unittest_" + pdf.nimi, Buffer.from(pdf.sisalto, "base64"));
  });
});
