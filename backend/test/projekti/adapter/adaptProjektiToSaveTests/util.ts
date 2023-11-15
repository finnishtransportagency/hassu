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
  handleChangedAineistotAndTiedostotStub: sinon.SinonStub<[oid: string], Promise<void>>;
  handleChangedAineistoStub: sinon.SinonStub<[oid: string], Promise<void>>;
  handleChangedTiedostotStub: sinon.SinonStub<[oid: string], Promise<void>>;
} {
  sinon.stub(personSearch, "getKayttajas").returns(Promise.resolve({} as Kayttajas));
  sinon.stub(KayttoOikeudetManager, "prototype").returns(MockKayttoOikeudetManager);
  sinon.stub(lisaAineistoService, "generateSalt").returns("salt");
  const handleChangedAineistotAndTiedostotStub = sinon.stub(eventSqsClient, "handleChangedAineistotAndTiedostot");
  const handleChangedAineistoStub = sinon.stub(eventSqsClient, "handleChangedAineisto");
  const handleChangedTiedostotStub = sinon.stub(eventSqsClient, "handleChangedTiedostot");
  return { handleChangedAineistotAndTiedostotStub, handleChangedAineistoStub, handleChangedTiedostotStub };
}

export const testDbProjekti: DBProjekti = {
  oid: "1",
  versio: 1,
  kayttoOikeudet: [],
};
