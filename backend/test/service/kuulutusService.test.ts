/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import { KuulutusService } from "../../src/service/kuulutus/kuulutusService";
import { KuulutusTyyppi } from "../../../common/graphql/apiModel";
import fs from "fs";

const { expect } = require("chai");

describe("kuulutusService", async () => {
  it("should generate pdf succesfully", async () => {
    const pdf = await new KuulutusService().createPDF(
      {
        nimi: "Valtatie 11 parantaminen välillä Murhasaari–Mustikkakangas",
        oid: "123",
        kunnat: ["Nokia"],
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
    expect(pdf.nimi).not.to.be.empty;
    fs.mkdirSync(".report", { recursive: true });
    fs.writeFileSync(".report/unittest_" + pdf.nimi, Buffer.from(pdf.sisalto, "base64"));
  });
});
