import * as _uuid from "uuid";
import mocha from "mocha";
import * as sinon from "sinon";
import crypto from "crypto";
import { uuid } from "hassu-common/util/uuid";
// Koodia, jota voi käyttää sekä yksikkö-, että integraatiotesteissä

// Mockataan UUID:n generointi tuottamaan joka testiajolla samat arvot

export function mockUUID(): void {
  let uuidMock: sinon.SinonStub;
  mocha.before(() => {
    uuidMock = sinon.stub(uuid, "v4");
  });
  mocha.beforeEach(function () {
    // Alustetaan UUID:n generointi testinimen perusteella
    const currentTestName = this.currentTest?.fullTitle() || "";
    const hashOfTestName = crypto.createHash("sha256").update(currentTestName).digest().slice(0, 16).valueOf();
    // Tuotetaan testin sisällä sama sarja uuid:n arvoja laskurin avulla
    hashOfTestName[0] = 0;
    hashOfTestName[1] = 0;
    hashOfTestName[2] = 0;
    hashOfTestName[3] = 0;
    uuidMock.callsFake(() => {
      hashOfTestName[3]++;
      return _uuid.v4({ random: hashOfTestName });
    });
  });
}
