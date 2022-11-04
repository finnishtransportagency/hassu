import { describe, it } from "mocha";
import sinon from "sinon";
import { ilmoitustauluSyoteService } from "../../src/ilmoitustauluSyote/ilmoitustauluSyoteService";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { AloitusKuulutusTila, ProjektiJulkinen } from "../../../common/graphql/apiModel";
import { projektiAdapterJulkinen } from "../../src/projekti/adapter/projektiAdapterJulkinen";
import { openSearchClientIlmoitustauluSyote } from "../../src/projektiSearch/openSearchClient";
import { ilmoitustauluSyoteHandler } from "../../src/ilmoitustauluSyote/ilmoitustauluSyoteHandler";

const { expect } = require("chai");
const sandbox = sinon.createSandbox();

describe("IlmoitustauluSyote", () => {
  let putDocumentStub: sinon.SinonStub;
  let projekti: ProjektiJulkinen;

  beforeEach(() => {
    putDocumentStub = sandbox.stub(openSearchClientIlmoitustauluSyote, "putDocument");
    const projektiFixture = new ProjektiFixture();
    projekti = projektiAdapterJulkinen.adaptProjekti(projektiFixture.dbProjekti4())!;
    expect(projekti.aloitusKuulutusJulkaisu?.tila).to.eql(AloitusKuulutusTila.HYVAKSYTTY);
  });

  afterEach(() => {
    sandbox.reset();
  });

  after(() => {
    sandbox.restore();
  });

  it("Should index projekti into ilmoitustaulusyote index successfully", async () => {
    await ilmoitustauluSyoteService.index(projekti);
    expect(putDocumentStub.getCalls().map((call) => call.lastArg)).toMatchSnapshot();

    const indexedAloitusKuulutus = putDocumentStub!.getCalls()?.slice(0, 1)?.pop()?.lastArg;
    expect(ilmoitustauluSyoteHandler.getCategories(indexedAloitusKuulutus)).to.eql([
      "Kuulutukset ja ilmoitukset:Kuulutus",
      "Kunta:Mikkeli",
      "Kunta:Juva",
      "Kunta:Savonlinna",
      "Maakunta:Uusimaa",
      "Maakunta:Pirkanmaa",
    ]);
  });
});
