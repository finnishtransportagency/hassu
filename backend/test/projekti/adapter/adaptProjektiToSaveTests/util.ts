import sinon from "sinon";
import { personSearch } from "../../../../src/personSearch/personSearchClient";
import { Kayttajas } from "../../../../src/personSearch/kayttajas";
import { KayttoOikeudetManager } from "../../../../src/projekti/kayttoOikeudetManager";
import { lisaAineistoService } from "../../../../src/tiedostot/lisaAineistoService";
import { eventSqsClient } from "../../../../src/sqsEvents/eventSqsClient";
import { DBProjekti } from "../../../../src/database/model";

class MockKayttoOikeudetManager {
  applyChanges() {}
}
export function stubBasics(): {
  handleChangedAineistoStub: sinon.SinonStub<[oid: string], Promise<void>>;
  handleChangedTiedostotStub: sinon.SinonStub<[oid: string], Promise<void>>;
} {
  sinon.stub(personSearch, "getKayttajas").returns(Promise.resolve({} as Kayttajas));
  sinon.stub(KayttoOikeudetManager, "prototype").returns(MockKayttoOikeudetManager);
  sinon.stub(lisaAineistoService, "generateSalt").returns("salt");
  const handleChangedAineistoStub = sinon.stub(eventSqsClient, "handleAineistoChanged");
  const handleChangedTiedostotStub = sinon.stub(eventSqsClient, "handleTiedostotChanged");
  return { handleChangedAineistoStub, handleChangedTiedostotStub };
}

export const testDbProjekti: DBProjekti = {
  oid: "1",
  versio: 1,
  kayttoOikeudet: [],
};
