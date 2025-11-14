import { describe, it } from "mocha";
import sinon from "sinon";
import { ilmoitustauluSyoteService } from "../../src/ilmoitustauluSyote/ilmoitustauluSyoteService";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { KuulutusJulkaisuTila } from "hassu-common/graphql/apiModel";
import { projektiAdapterJulkinen } from "../../src/projekti/adapter/projektiAdapterJulkinen";
import { openSearchClientIlmoitustauluSyote } from "../../src/projektiSearch/openSearchClientIlmoitustauluSyote";
import { ilmoitustauluSyoteHandler } from "../../src/ilmoitustauluSyote/ilmoitustauluSyoteHandler";
import { expect } from "chai";
import { assertIsDefined } from "../../src/util/assertions";
import { JulkaisuKey, JULKAISU_KEYS } from "../../src/database/model/julkaisuKey";

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
    const projekti = await projektiAdapterJulkinen.adaptProjekti(projektiFixture.dbProjekti4());
    assertIsDefined(projekti);
    expect(projekti.aloitusKuulutusJulkaisu?.tila).to.eql(KuulutusJulkaisuTila.HYVAKSYTTY);
    await ilmoitustauluSyoteService.index(projekti);
    expect(putDocumentStub.getCalls().map((call) => ({ [call.firstArg]: call.lastArg }))).toMatchSnapshot();

    const indexedAloitusKuulutus = putDocumentStub.getCalls()?.slice(0, 1)?.pop()?.lastArg;
    expect(ilmoitustauluSyoteHandler.getCategories(indexedAloitusKuulutus)).to.eql([
      "Kuulutukset ja ilmoitukset:Kuulutus",
      "Kunta:Mikkeli",
      "Kunta:Juva",
      "Kunta:Savonlinna",
      "Maakunta:Uusimaa",
      "Maakunta:Pirkanmaa",
      "Väylämuoto:Tie"
    ]);
  });

  it("Should index pohjoissaame projekti into ilmoitustaulusyote index successfully", async () => {
    const projektiFixture = new ProjektiFixture();
    const projekti = await projektiAdapterJulkinen.adaptProjekti(projektiFixture.dbProjektiHyvaksymisMenettelyssaSaame());
    assertIsDefined(projekti);
    await ilmoitustauluSyoteService.index(projekti);
    expect(putDocumentStub.getCalls().map((call) => ({ [call.firstArg]: call.lastArg }))).toMatchSnapshot();

    const indexedAloitusKuulutus = putDocumentStub.getCalls()?.slice(0, 1)?.pop()?.lastArg;
    expect(ilmoitustauluSyoteHandler.getCategories(indexedAloitusKuulutus)).to.eql([
      "Kuulutukset ja ilmoitukset:Kuulutus",
      "Kunta:Mikkeli",
      "Kunta:Juva",
      "Kunta:Savonlinna",
      "Maakunta:Uusimaa",
      "Maakunta:Pirkanmaa",
      "Väylämuoto:Tie"
    ]);
  });

  it("Should index all of projekti's julkaisus into ilmoitustaulusyote index", async () => {
    const projektiFixture = new ProjektiFixture();
    const dbProjekti = projektiFixture.dbProjekti4();
    const projekti = await projektiAdapterJulkinen.adaptProjekti(dbProjekti);
    assertIsDefined(projekti);
    await ilmoitustauluSyoteService.index(projekti);
    expect(putDocumentStub.getCalls().map((call) => call.lastArg.title)).to.eql([
      "Kuulutus suunnittelun aloittamisesta: Marikan testiprojekti",
      "Kungörelse om inledande av planering: Marikas testprojekt",
      "Kutsu vuorovaikutukseen: Testiprojekti 4",
      "Inbjudan till interaktion: Namnet på svenska",
      "Kuulutus suunnitelman nähtäville asettamisesta: Mt 140 parantaminen Kaskelantien kohdalla, tiesuunnitelma, Kerava",
      "Kungörelse om framläggande av plan: sv",
      "Kuulutus suunnitelman hyväksymispäätöksestä: HASSU AUTOMAATTITESTIPROJEKTI1",
      "Kungörelse av beslutet att godkänna planen: Namnet på svenska",
    ]);
  });

  it("Should index only julkaisu's that are not copied from another projekti", async () => {
    const projektiFixture = new ProjektiFixture();
    const dbProjekti = projektiFixture.dbProjekti4();
    const copiedJulkaisuKeys: JulkaisuKey[] = ["aloitusKuulutusJulkaisut", "vuorovaikutusKierrosJulkaisut", "nahtavillaoloVaiheJulkaisut"];
    JULKAISU_KEYS.filter((key) => copiedJulkaisuKeys.includes(key)).forEach((key) =>
      dbProjekti[key]?.forEach((julkaisu) => (julkaisu.kopioituProjektista = "oid-123"))
    );
    const projekti = await projektiAdapterJulkinen.adaptProjekti(dbProjekti);

    assertIsDefined(projekti);
    await ilmoitustauluSyoteService.index(projekti);
    expect(putDocumentStub.getCalls().map((call) => call.lastArg.title)).to.eql([
      "Kuulutus suunnitelman hyväksymispäätöksestä: HASSU AUTOMAATTITESTIPROJEKTI1",
      "Kungörelse av beslutet att godkänna planen: Namnet på svenska",
    ]);
  });

  it("Should index none of projekti's julkaisu's if every julkaisu is copied from another projekti", async () => {
    const projektiFixture = new ProjektiFixture();
    const dbProjekti = projektiFixture.dbProjekti4();
    JULKAISU_KEYS.forEach((key) => dbProjekti[key]?.forEach((julkaisu) => (julkaisu.kopioituProjektista = "oid-123")));
    const projekti = await projektiAdapterJulkinen.adaptProjekti(dbProjekti);
    assertIsDefined(projekti);
    await ilmoitustauluSyoteService.index(projekti);
    putDocumentStub.getCalls().length;
    expect(putDocumentStub.getCalls().length).to.equal(0);
  });
});
