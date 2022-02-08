/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import { AsiakirjaService } from "../../src/asiakirja/asiakirjaService";
import { AsiakirjaTyyppi } from "../../../common/graphql/apiModel";
import fs from "fs";
import { asiakirjaAdapter } from "../../src/handler/asiakirjaAdapter";
import { ProjektiFixture } from "../fixture/projektiFixture";

const { expect } = require("chai");

describe("asiakirjaService", async () => {
  it("should generate pdf succesfully", async () => {
    const projekti = new ProjektiFixture().dbProjekti1;
    const aloitusKuulutusJulkaisu = asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti);
    expect(aloitusKuulutusJulkaisu).toMatchSnapshot();
    const pdf = await new AsiakirjaService().createPdf({
      aloitusKuulutusJulkaisu: aloitusKuulutusJulkaisu!,
      asiakirjaTyyppi: AsiakirjaTyyppi.ALOITUSKUULUTUS,
    });
    expect(pdf.sisalto.length).to.be.greaterThan(50000);
    // tslint:disable-next-line:no-unused-expression
    expect(pdf.nimi).not.to.be.empty;
    fs.mkdirSync(".report", { recursive: true });
    fs.writeFileSync(".report/unittest_" + pdf.nimi, Buffer.from(pdf.sisalto, "base64"));
  });
});
