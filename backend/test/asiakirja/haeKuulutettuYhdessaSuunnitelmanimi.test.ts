// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { expect } from "chai";
import { Kieli } from "hassu-common/graphql/apiModel";
import { haeKuulutettuYhdessaSuunnitelmanimi } from "../../src/asiakirja/haeKuulutettuYhdessaSuunnitelmanimi";
import { DBProjekti, ProjektinJakautuminen } from "../../src/database/model";
import { projektiDatabase } from "../../src/database/projektiDatabase";

describe("haeKuulutettuYhdessaSuunnitelmanimi", () => {
  let loadProjektiStub: sinon.SinonStub;

  beforeEach(() => {
    loadProjektiStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should return undefined if projektinJakautuminen is undefined", async () => {
    const result = await haeKuulutettuYhdessaSuunnitelmanimi(undefined, Kieli.SUOMI);
    expect(result).to.be.undefined;
    expect(loadProjektiStub.called).to.be.false;
  });

  it("should return undefined if no jaettu projekti oid found", async () => {
    const jakautuminen: ProjektinJakautuminen = {};
    const result = await haeKuulutettuYhdessaSuunnitelmanimi(jakautuminen, Kieli.SUOMI);
    expect(result).to.be.undefined;
    expect(loadProjektiStub.called).to.be.false;
  });

  it("should return SUOMI name for jaettuProjektista", async () => {
    const oid = "1.2.3";
    const jakautuminen: ProjektinJakautuminen = { jaettuProjektista: oid };
    loadProjektiStub.resolves({
      oid,
      velho: { nimi: "Suomenkielinen nimi" },
      kielitiedot: { ensisijainenKieli: Kieli.SUOMI },
    } as unknown as DBProjekti);
    const result = await haeKuulutettuYhdessaSuunnitelmanimi(jakautuminen, Kieli.SUOMI);
    expect(result).to.equal("Suomenkielinen nimi");
    expect(loadProjektiStub.calledOnceWith(oid, true, false)).to.be.true;
  });

  it("should return RUOTSI name when kieli is RUOTSI and project has Swedish name", async () => {
    const oid = "1.2.3";
    const jakautuminen: ProjektinJakautuminen = { jaettuProjektista: oid };
    loadProjektiStub.resolves({
      oid,
      velho: { nimi: "Suomenkielinen nimi" },
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.RUOTSI,
        projektinNimiVieraskielella: "Svenskt namn",
      },
    } as unknown as DBProjekti);
    const result = await haeKuulutettuYhdessaSuunnitelmanimi(jakautuminen, Kieli.RUOTSI);
    expect(result).to.equal("Svenskt namn");
  });

  it("should return SUOMI name when kieli is RUOTSI but project has no Swedish name", async () => {
    const oid = "1.2.3";
    const jakautuminen: ProjektinJakautuminen = { jaettuProjektista: oid };
    loadProjektiStub.resolves({
      oid,
      velho: { nimi: "Suomenkielinen nimi" },
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.POHJOISSAAME,
        projektinNimiVieraskielella: "Sámegillii namma",
      },
    } as unknown as DBProjekti);
    const result = await haeKuulutettuYhdessaSuunnitelmanimi(jakautuminen, Kieli.RUOTSI);
    expect(result).to.equal("Suomenkielinen nimi");
  });

  it("should return SUOMI name for jaettuProjekteihin", async () => {
    const oid = "1.2.3";
    const jakautuminen: ProjektinJakautuminen = { jaettuProjekteihin: [oid] };
    loadProjektiStub.resolves({
      oid,
      velho: { nimi: "Jaetun projektin nimi" },
    } as unknown as DBProjekti);
    const result = await haeKuulutettuYhdessaSuunnitelmanimi(jakautuminen, Kieli.SUOMI);
    expect(result).to.equal("Jaetun projektin nimi");
  });

  it("should return undefined if project not found in database", async () => {
    const oid = "1.2.3";
    const jakautuminen: ProjektinJakautuminen = { jaettuProjektista: oid };
    loadProjektiStub.resolves(undefined);
    const result = await haeKuulutettuYhdessaSuunnitelmanimi(jakautuminen, Kieli.SUOMI);
    expect(result).to.be.undefined;
  });

  it("should return undefined if project has no velho.nimi", async () => {
    const oid = "1.2.3";
    const jakautuminen: ProjektinJakautuminen = { jaettuProjektista: oid };
    loadProjektiStub.resolves({
      oid,
      velho: {},
    } as unknown as DBProjekti);
    const result = await haeKuulutettuYhdessaSuunnitelmanimi(jakautuminen, Kieli.SUOMI);
    expect(result).to.be.undefined;
  });
});
