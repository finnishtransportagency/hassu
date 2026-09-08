import { beforeEach, describe, it } from "mocha";
import sinon from "sinon";
import { expect } from "chai";
import { Kieli } from "hassu-common/graphql/apiModel";
import { ilmoitustauluSyoteHandler } from "../../src/ilmoitustauluSyote/ilmoitustauluSyoteHandler";
import { openSearchClientIlmoitustauluSyote } from "../../src/projektiSearch/openSearchClientIlmoitustauluSyote";
import { kuntametadata } from "hassu-common/kuntametadata";

describe("IlmoitustauluSyoteHandler", () => {
  let queryStub: sinon.SinonStub;

  beforeEach(() => {
    queryStub = sinon.stub(openSearchClientIlmoitustauluSyote, "query").resolves({
      hits: {
        hits: [],
      },
    } as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("Should filter by project OIDs", async () => {
    await ilmoitustauluSyoteHandler.getFeed(Kieli.SUOMI, undefined, undefined, undefined, undefined, ["oid-1", "oid-2", "oid-3"]);

    expect(queryStub.calledOnce).to.equal(true);

    const query = queryStub.firstCall.firstArg;

    expect(query.query.bool.must).to.deep.include({
      terms: {
        "oid.keyword": ["oid-1", "oid-2", "oid-3"],
      },
    });
  });

  it("Should not filter by project OIDs when project OIDs are not provided", async () => {
    await ilmoitustauluSyoteHandler.getFeed(Kieli.SUOMI, undefined, undefined, undefined, undefined, undefined);

    const query = queryStub.firstCall.firstArg;

    expect(query.query.bool.must).to.eql([
      {
        terms: {
          "kieli.keyword": [Kieli.SUOMI, Kieli.POHJOISSAAME],
        },
      },
    ]);
  });

  it("Should filter only by elinvoimakeskus", async () => {
    sinon.stub(kuntametadata, "elinvoimakeskusIdFromKey").withArgs("test-evk").returns("123");

    await ilmoitustauluSyoteHandler.getFeed(Kieli.SUOMI, undefined, undefined, "test-evk", undefined, undefined);

    expect(queryStub.calledOnce).to.equal(true);

    const query = queryStub.firstCall.firstArg;

    expect(query.query.bool.must).to.eql([
      {
        terms: {
          "kieli.keyword": [Kieli.SUOMI, Kieli.POHJOISSAAME],
        },
      },
      {
        term: {
          "elinvoimakeskukset.keyword": "123",
        },
      },
    ]);
  });

  it("Should combine elinvoimakeskus and project OID filters", async () => {
    sinon.stub(kuntametadata, "elinvoimakeskusIdFromKey").withArgs("test-evk").returns("123");

    await ilmoitustauluSyoteHandler.getFeed(Kieli.SUOMI, undefined, undefined, "test-evk", undefined, ["oid-1", "oid-2"]);

    const query = queryStub.firstCall.firstArg;

    expect(query.query.bool.must).to.eql([
      {
        terms: {
          "kieli.keyword": [Kieli.SUOMI, Kieli.POHJOISSAAME],
        },
      },
      {
        term: {
          "elinvoimakeskukset.keyword": "123",
        },
      },
      {
        terms: {
          "oid.keyword": ["oid-1", "oid-2"],
        },
      },
    ]);
  });
});
