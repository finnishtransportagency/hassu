import { describe, it } from "mocha";

import { expect } from "chai";
import { haeAktiivisenVaiheenAsianhallinnanTila } from "../../src/projekti/adapter/haeAktiivisenVaiheenAsianhallinnanTila";
import * as sinon from "sinon";
import { asianhallintaService } from "../../src/asianhallinta/asianhallintaService";
import { parameters } from "../../src/aws/parameters";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { AsianTila, Vaihe, VuorovaikutusKierrosTila } from "hassu-common/graphql/apiModel";
import { projektiAdapter } from "../../src/projekti/adapter/projektiAdapter";
import { cloneDeep } from "lodash";
import { DBProjekti } from "../../src/database/model";
import { assertIsDefined } from "../../src/util/assertions";

describe("haeAktiivisenVaiheenAsianhallinanTila", () => {
  let checkAsianhallintaStateStub: sinon.SinonStub;
  let isAsianhallintaIntegrationEnabledStub: sinon.SinonStub;
  let isUspaIntegrationEnabledStub: sinon.SinonStub;
  let dbProjekti: DBProjekti;

  before(async () => {
    isAsianhallintaIntegrationEnabledStub = sinon.stub(parameters, "isAsianhallintaIntegrationEnabled");
    isUspaIntegrationEnabledStub = sinon.stub(parameters, "isUspaIntegrationEnabled");
    checkAsianhallintaStateStub = sinon.stub(asianhallintaService, "checkAsianhallintaState");
    checkAsianhallintaStateStub.returns(Promise.resolve(AsianTila.VALMIS_VIENTIIN));
  });

  beforeEach(() => {
    isAsianhallintaIntegrationEnabledStub.returns(Promise.resolve(true));
    isUspaIntegrationEnabledStub.returns(Promise.resolve(true));
    dbProjekti = cloneDeep(new ProjektiFixture().dbProjekti3);
    delete dbProjekti.nahtavillaoloVaihe;
    delete dbProjekti.nahtavillaoloVaiheJulkaisut;
  });

  afterEach(() => {
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  it("should check asianhallinnan tila for Vaihe.SUUNNITTELU if vuorovaikutusKierros is first modifiable Vaihe", async () => {
    assertIsDefined(dbProjekti.vuorovaikutusKierros);
    dbProjekti.vuorovaikutusKierros.tila = VuorovaikutusKierrosTila.MUOKATTAVISSA;
    const projekti = await projektiAdapter.adaptProjekti(dbProjekti, undefined, false);
    await haeAktiivisenVaiheenAsianhallinnanTila(projekti);
    expect(checkAsianhallintaStateStub.calledOnce).to.be.true;
    expect(checkAsianhallintaStateStub.firstCall.firstArg).to.equal(projekti.oid);
    expect(checkAsianhallintaStateStub.firstCall.lastArg).to.equal(Vaihe.SUUNNITTELU);
  });

  it("should check asianhallinnan tila for Vaihe.SUUNNITTELU if vuorovaikutusKierros is missing", async () => {
    delete dbProjekti.vuorovaikutusKierros;
    delete dbProjekti.vuorovaikutusKierrosJulkaisut;
    const projekti = await projektiAdapter.adaptProjekti(dbProjekti, undefined, false);
    await haeAktiivisenVaiheenAsianhallinnanTila(projekti);
    expect(checkAsianhallintaStateStub.calledOnce).to.be.true;
    expect(checkAsianhallintaStateStub.firstCall.firstArg).to.equal(projekti.oid);
    expect(checkAsianhallintaStateStub.firstCall.lastArg).to.equal(Vaihe.SUUNNITTELU);
  });

  it("should check asianhallinnan tila for Vaihe.NAHTAVILLAOLO if vuorovaikutusKierros is missing and vahainenMenettely", async () => {
    delete dbProjekti.vuorovaikutusKierros;
    delete dbProjekti.vuorovaikutusKierrosJulkaisut;
    dbProjekti.vahainenMenettely = true;
    const projekti = await projektiAdapter.adaptProjekti(dbProjekti, undefined, false);
    await haeAktiivisenVaiheenAsianhallinnanTila(projekti);
    expect(checkAsianhallintaStateStub.calledOnce).to.be.true;
    expect(checkAsianhallintaStateStub.firstCall.firstArg).to.equal(projekti.oid);
    expect(checkAsianhallintaStateStub.firstCall.lastArg).to.equal(Vaihe.NAHTAVILLAOLO);
  });

  it("should check asianhallinnan tila for Vaihe.NAHTAVILLAOLO if vuorovaikutusKierros is first modifiable Vaihe and palattuNahtavillaolosta is true", async () => {
    assertIsDefined(dbProjekti.vuorovaikutusKierros);
    dbProjekti.vuorovaikutusKierros.palattuNahtavillaolosta = true;
    const projekti = await projektiAdapter.adaptProjekti(dbProjekti, undefined, false);
    await haeAktiivisenVaiheenAsianhallinnanTila(projekti);
    expect(checkAsianhallintaStateStub.calledOnce).to.be.true;
    expect(checkAsianhallintaStateStub.firstCall.firstArg).to.equal(projekti.oid);
    expect(checkAsianhallintaStateStub.firstCall.lastArg).to.equal(Vaihe.NAHTAVILLAOLO);
  });
});
