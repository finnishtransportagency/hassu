// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import { adaptProjekti, applyKasittelyntilaToVelho, findUpdatedFields } from "../../src/velho/velhoAdapter";
import { default as velhoTieProjecti } from "./fixture/velhoTieProjekti.json";
import cloneDeep from "lodash/cloneDeep";
import { Velho } from "../../src/database/model";
import { ProjektiProjekti, ProjektiProjektiMuokkaus } from "../../src/velho/projektirekisteri";

import { expect } from "chai";
import sinon from "sinon";
import { parameters } from "../../src/aws/parameters";

describe("VelhoAdapter", () => {
  let isAsianhallintaIntegrationEnabledStub: sinon.SinonStub;
  let isUspaIntegrationEnabledStub: sinon.SinonStub;

  before(() => {
    isAsianhallintaIntegrationEnabledStub = sinon.stub(parameters, "isAsianhallintaIntegrationEnabled");
    isUspaIntegrationEnabledStub = sinon.stub(parameters, "isUspaIntegrationEnabled");
  });

  after(() => {
    isAsianhallintaIntegrationEnabledStub.restore();
    isUspaIntegrationEnabledStub.restore();
  });

  beforeEach(() => {
    isAsianhallintaIntegrationEnabledStub.returns(Promise.resolve(false));
    isUspaIntegrationEnabledStub.returns(Promise.resolve(false));
  });

  it("should adapt project from Velho successfully", async () => {
    expect(await adaptProjekti(velhoTieProjecti.data as unknown as ProjektiProjekti)).toMatchSnapshot();
  });

  it("should adapt project with kunta and maakunta keys from Velho successfully", async () => {
    const velhoData = cloneDeep(velhoTieProjecti.data as unknown as ProjektiProjekti);
    // eslint-disable-next-line @typescript-eslint/ban-types
    velhoData.ominaisuudet.kunta = new Set<object>(["kunta/kunta049", "kunta/kunta092", "kunta/kunta091"] as unknown as object[]);
    delete velhoData.ominaisuudet["muu-kunta"];

    // eslint-disable-next-line @typescript-eslint/ban-types
    velhoData.ominaisuudet.maakunta = new Set<object>(["maakunta/maakunta001"] as unknown as object[]);
    delete velhoData.ominaisuudet["muu-maakunta"];
    expect(await adaptProjekti(velhoData)).toMatchSnapshot();
  });

  it("should find updated Velho fields successfully", async () => {
    const oldVelho: Velho = (await adaptProjekti(velhoTieProjecti.data as unknown as ProjektiProjekti)).velho!;
    const newVelho: Velho = cloneDeep(oldVelho);
    newVelho.nimi = "Uusi nimi";
    newVelho.vaylamuoto = ["rata"];
    newVelho.vastuuhenkilonEmail = "uusi@vayla.fi";
    const differencies = findUpdatedFields(oldVelho, newVelho);
    expect(differencies).toMatchSnapshot();
  });

  it("should write nahtavillaAlku and nahtavillaLoppu to Velho nahtavilla-olo field", () => {
    const projekti = { ominaisuudet: {} } as unknown as ProjektiProjektiMuokkaus;
    applyKasittelyntilaToVelho(projekti, { nahtavillaAlku: "2024-03-01", nahtavillaLoppu: "2024-03-30" });
    const nahtavillaOlo = projekti.ominaisuudet["nahtavilla-olo"] as { alkaen: unknown; paattyen: unknown };
    expect(nahtavillaOlo).to.exist;
    expect(nahtavillaOlo.alkaen).to.exist;
    expect(nahtavillaOlo.paattyen).to.exist;
  });

  it("should not overwrite existing nahtavilla-olo paattyen when nahtavillaLoppu is not given", () => {
    const existingPaattyen = {} as unknown;
    const projekti = {
      ominaisuudet: { "nahtavilla-olo": { alkaen: {}, paattyen: existingPaattyen } },
    } as unknown as ProjektiProjektiMuokkaus;
    applyKasittelyntilaToVelho(projekti, { nahtavillaAlku: "2024-03-01" });
    const nahtavillaOlo = projekti.ominaisuudet["nahtavilla-olo"] as { alkaen: unknown; paattyen: unknown };
    expect(nahtavillaOlo.paattyen).to.equal(existingPaattyen);
  });

  it("should adapt nahtavillaAlku and nahtavillaLoppu from Velho nahtavilla-olo field", async () => {
    const velhoData = cloneDeep(velhoTieProjecti.data as unknown as ProjektiProjekti);
    velhoData.ominaisuudet["nahtavilla-olo"] = {
      alkaen: "2024-03-01T00:00:00+02:00" as unknown as object,
      paattyen: "2024-03-30T00:00:00+02:00" as unknown as object,
    };
    const result = await adaptProjekti(velhoData);
    expect(result.kasittelynTila?.nahtavillaAlku).to.exist;
    expect(result.kasittelynTila?.nahtavillaLoppu).to.exist;
  });
});
