import sinon from "sinon";
import mocha from "mocha";
import openSearchClientYllapito from "../src/projektiSearch/openSearchClientYllapito";
import { openSearchClientIlmoitustauluSyote } from "../src/projektiSearch/openSearchClientIlmoitustauluSyote";
import { openSearchClientJulkinen } from "../src/projektiSearch/openSearchClientJulkinen";
import * as API from "hassu-common/graphql/apiModel";

export function mockOpenSearch() {
  const queryMocks: sinon.SinonStub[] = [];
  mocha.before(() => {
    queryMocks.push(sinon.stub(openSearchClientYllapito, "query"));
    sinon.stub(openSearchClientYllapito, "deleteDocument");
    sinon.stub(openSearchClientYllapito, "putDocument");
    queryMocks.push(sinon.stub(openSearchClientIlmoitustauluSyote, "query"));
    sinon.stub(openSearchClientIlmoitustauluSyote, "deleteDocument");
    sinon.stub(openSearchClientIlmoitustauluSyote, "putDocument");

    queryMocks.push(sinon.stub(openSearchClientJulkinen[API.Kieli.SUOMI], "query"));
    sinon.stub(openSearchClientJulkinen[API.Kieli.SUOMI], "deleteDocument");
    sinon.stub(openSearchClientJulkinen[API.Kieli.SUOMI], "putDocument");

    queryMocks.push(sinon.stub(openSearchClientJulkinen[API.Kieli.RUOTSI], "query"));
    sinon.stub(openSearchClientJulkinen[API.Kieli.RUOTSI], "deleteDocument");
    sinon.stub(openSearchClientJulkinen[API.Kieli.RUOTSI], "putDocument");
  });

  mocha.beforeEach(() => {
    queryMocks.forEach((qm) => qm.resolves({ status: 200 }));
  });
}
