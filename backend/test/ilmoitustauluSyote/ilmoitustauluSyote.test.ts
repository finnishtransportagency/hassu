import { describe, it } from "mocha";
import sinon from "sinon";
import { ilmoitustauluSyoteService } from "../../src/ilmoitustauluSyote/ilmoitustauluSyoteService";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { KuulutusJulkaisuTila, ProjektiJulkinen } from "../../../common/graphql/apiModel";
import { projektiAdapterJulkinen } from "../../src/projekti/adapter/projektiAdapterJulkinen";
import { openSearchClientIlmoitustauluSyote } from "../../src/projektiSearch/openSearchClient";
import { ilmoitustauluSyoteHandler } from "../../src/ilmoitustauluSyote/ilmoitustauluSyoteHandler";

const { expect } = require("chai");

describe("IlmoitustauluSyote", () => {
  let putDocumentStub: sinon.SinonStub;

  before(async () => {
    putDocumentStub = sinon.stub(openSearchClientIlmoitustauluSyote, "putDocument");
  });

  afterEach(() => {
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  it("Should index projekti into ilmoitustaulusyote index successfully", async () => {
    const projektiFixture = new ProjektiFixture();
    let projekti: ProjektiJulkinen = (await projektiAdapterJulkinen.adaptProjekti(projektiFixture.dbProjekti4()))!;
    expect(projekti.aloitusKuulutusJulkaisu?.tila).to.eql(KuulutusJulkaisuTila.HYVAKSYTTY);
    await ilmoitustauluSyoteService.index(projekti);
    expect(putDocumentStub.getCalls().map((call) => ({ [call.firstArg]: call.lastArg }))).toMatchSnapshot();

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

  it("Should index pohjoissaame projekti into ilmoitustaulusyote index successfully", async () => {
    const projektiFixture = new ProjektiFixture();
    let projekti: ProjektiJulkinen = (await projektiAdapterJulkinen.adaptProjekti(
      projektiFixture.dbProjektiHyvaksymisMenettelyssaSaame()
    ))!;
    await ilmoitustauluSyoteService.index(projekti);
    expect(putDocumentStub.getCalls().map((call) => ({ [call.firstArg]: call.lastArg }))).toMatchSnapshot();

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
