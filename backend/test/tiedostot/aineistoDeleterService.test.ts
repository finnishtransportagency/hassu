// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { expect } from "chai";
import { aineistoDeleterService } from "../../src/tiedostot/aineistoDeleterService";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { projektiEntityDatabase } from "../../src/database/projektiEntityDatabase";
import { nahtavillaoloVaiheJulkaisuDatabase } from "../../src/database/nahtavillaoloVaiheJulkaisuDatabase";
import { fileService } from "../../src/files/fileService";
import { ImportContext } from "../../src/tiedostot/importContext";
import { Status } from "hassu-common/graphql/apiModel";
import { createJulkaisuSortKey } from "../../src/database/julkaisuItemKeys";
import { JulkaisuByPrefix, JulkaisuPrefix } from "../../src/database/model/projektiDataItem";

describe("aineistoDeleterService", () => {
  let putStub: sinon.SinonStub;
  let deleteStub: sinon.SinonStub;

  beforeEach(() => {
    putStub = sinon.stub(projektiEntityDatabase, "put").resolves();
    deleteStub = sinon.stub(projektiEntityDatabase, "delete").resolves();
    sinon.stub(projektiDatabase.aloitusKuulutusJulkaisut, "update").resolves();
    sinon.stub(projektiDatabase.vuorovaikutusKierrosJulkaisut, "update").resolves();
    sinon.stub(nahtavillaoloVaiheJulkaisuDatabase, "put").resolves();
    sinon.stub(projektiDatabase, "removeProjektiAttributesFromEpaaktiivinenProjekti").resolves();
    sinon.stub(fileService, "listYllapitoProjektiFiles").resolves({});
  });

  afterEach(() => {
    sinon.restore();
  });

  function createMockJulkaisu<P extends JulkaisuPrefix>(prefix: P): Partial<JulkaisuByPrefix<P>> {
    const julkaisu = { projektiOid: "oid-1", sortKey: createJulkaisuSortKey(prefix, 1), id: 1 };
    return julkaisu as Partial<JulkaisuByPrefix<P>>;
  }

  function createMockContext(status: Status): ImportContext {
    const hyvJulkaisu = createMockJulkaisu("JULKAISU#HYVAKSYMISPAATOS#");
    const jatko1Julkaisu = createMockJulkaisu("JULKAISU#JATKOPAATOS1#");
    const jatko2Julkaisu = createMockJulkaisu("JULKAISU#JATKOPAATOS2#");

    const mockManager = {
      getAloitusKuulutusVaihe: () => ({ deleteAineistotIfEpaaktiivinen: sinon.stub().resolves([]) }),
      getVuorovaikutusKierros: () => ({ deleteAineistotIfEpaaktiivinen: sinon.stub().resolves([]) }),
      getNahtavillaoloVaihe: () => ({ deleteAineistotIfEpaaktiivinen: sinon.stub().resolves([]) }),
      getHyvaksymisPaatosVaihe: () => ({ deleteAineistotIfEpaaktiivinen: sinon.stub().resolves([hyvJulkaisu]) }),
      getJatkoPaatos1Vaihe: () => ({ deleteAineistotIfEpaaktiivinen: sinon.stub().resolves([jatko1Julkaisu]) }),
      getJatkoPaatos2Vaihe: () => ({ deleteAineistotIfEpaaktiivinen: sinon.stub().resolves([jatko2Julkaisu]) }),
    };

    return {
      oid: "oid-1",
      projekti: { oid: "oid-1" },
      projektiStatus: status,
      manager: mockManager,
    } as unknown as ImportContext;
  }

  it("should use put (not delete) for hyvaksymisPaatosVaihe julkaisut in EPAAKTIIVINEN_1", async () => {
    const ctx = createMockContext(Status.EPAAKTIIVINEN_1);
    await aineistoDeleterService.deleteAineistoIfEpaaktiivinen(ctx);
    expect(putStub.calledOnce).to.be.true;
    expect(putStub.firstCall.args[0].sortKey).to.include("JULKAISU#HYVAKSYMISPAATOS#");
    expect(deleteStub.called).to.be.false;
  });

  it("should use put (not delete) for jatkoPaatos1Vaihe julkaisut in EPAAKTIIVINEN_2", async () => {
    const ctx = createMockContext(Status.EPAAKTIIVINEN_2);
    await aineistoDeleterService.deleteAineistoIfEpaaktiivinen(ctx);
    const jatko1PutCall = putStub.getCalls().find((call) => call.args[0].sortKey?.includes("JULKAISU#JATKOPAATOS1#"));
    expect(jatko1PutCall).to.not.be.undefined;
    expect(deleteStub.called).to.be.false;
  });

  it("should use put (not delete) for jatkoPaatos2Vaihe julkaisut in EPAAKTIIVINEN_3", async () => {
    const ctx = createMockContext(Status.EPAAKTIIVINEN_3);
    await aineistoDeleterService.deleteAineistoIfEpaaktiivinen(ctx);
    const jatko2PutCall = putStub.getCalls().find((call) => call.args[0].sortKey?.includes("JULKAISU#JATKOPAATOS2#"));
    expect(jatko2PutCall).to.not.be.undefined;
    expect(deleteStub.called).to.be.false;
  });

  it("should use put for all three päätös types in EPAAKTIIVINEN_3", async () => {
    const ctx = createMockContext(Status.EPAAKTIIVINEN_3);
    await aineistoDeleterService.deleteAineistoIfEpaaktiivinen(ctx);
    expect(putStub.callCount).to.equal(3);
    const sortKeys = putStub.getCalls().map((call) => call.args[0].sortKey as string);
    expect(sortKeys.some((k) => k.includes("HYVAKSYMISPAATOS"))).to.be.true;
    expect(sortKeys.some((k) => k.includes("JATKOPAATOS1"))).to.be.true;
    expect(sortKeys.some((k) => k.includes("JATKOPAATOS2"))).to.be.true;
    expect(deleteStub.called).to.be.false;
  });
});
