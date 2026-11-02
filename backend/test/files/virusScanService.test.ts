// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import { expect } from "chai";
import { mockClient } from "aws-sdk-client-mock";
import { S3Client, GetObjectTaggingCommand } from "@aws-sdk/client-s3";
import { virusScanService } from "../../src/files/virusScanService";
import { ProjektiPaths } from "../../src/files/ProjektiPath";
import { LiitteenSkannausTulos } from "hassu-common/graphql/apiModel";

const OID = "1";
const LIITE = "/mielipiteet/test-id/tiedosto.pdf";
const projektiPaths = new ProjektiPaths(OID);

function makeTagSet(key: string, value: string) {
  return { TagSet: [{ Key: key, Value: value }] };
}

describe("virusScanService.getGuardDutyScanResult", () => {
  let s3Mock: ReturnType<typeof mockClient>;

  beforeEach(() => {
    s3Mock = mockClient(S3Client);
  });

  afterEach(() => {
    s3Mock.restore();
  });

  it("should return OK when GuardDuty tag is NO_THREATS_FOUND", async () => {
    s3Mock.on(GetObjectTaggingCommand).resolves(makeTagSet("GuardDutyMalwareScanStatus", "NO_THREATS_FOUND"));
    const tulos = await virusScanService.getGuardDutyScanResult(projektiPaths, LIITE);
    expect(tulos).to.equal(LiitteenSkannausTulos.OK);
  });

  it("should return SAASTUNUT when GuardDuty tag is THREATS_FOUND", async () => {
    s3Mock.on(GetObjectTaggingCommand).resolves(makeTagSet("GuardDutyMalwareScanStatus", "THREATS_FOUND"));
    const tulos = await virusScanService.getGuardDutyScanResult(projektiPaths, LIITE);
    expect(tulos).to.equal(LiitteenSkannausTulos.SAASTUNUT);
  });

  it("should throw when GuardDuty tag is UNSUPPORTED", async () => {
    s3Mock.on(GetObjectTaggingCommand).resolves(makeTagSet("GuardDutyMalwareScanStatus", "UNSUPPORTED"));
    await expect(virusScanService.getGuardDutyScanResult(projektiPaths, LIITE)).to.eventually.be.rejectedWith(
      "GuardDuty-skannaus epäonnistui: UNSUPPORTED"
    );
  });

  it("should throw when GuardDuty tag is ACCESS_DENIED", async () => {
    s3Mock.on(GetObjectTaggingCommand).resolves(makeTagSet("GuardDutyMalwareScanStatus", "ACCESS_DENIED"));
    await expect(virusScanService.getGuardDutyScanResult(projektiPaths, LIITE)).to.eventually.be.rejectedWith(
      "GuardDuty-skannaus epäonnistui: ACCESS_DENIED"
    );
  });

  it("should throw when GuardDuty tag is FAILED", async () => {
    s3Mock.on(GetObjectTaggingCommand).resolves(makeTagSet("GuardDutyMalwareScanStatus", "FAILED"));
    await expect(virusScanService.getGuardDutyScanResult(projektiPaths, LIITE)).to.eventually.be.rejectedWith(
      "GuardDuty-skannaus epäonnistui: FAILED"
    );
  });

  it("should throw when scan is still pending (no tag set)", async () => {
    s3Mock.on(GetObjectTaggingCommand).resolves({ TagSet: [] });
    await expect(virusScanService.getGuardDutyScanResult(projektiPaths, LIITE)).to.eventually.be.rejectedWith("Virusskannaus kesken");
  });

  it("should return SAASTUNUT when file is found in quarantine bucket", async () => {
    s3Mock.on(GetObjectTaggingCommand).rejectsOnce({ name: "NoSuchKey", message: "NoSuchKey" }).resolves({});
    const tulos = await virusScanService.getGuardDutyScanResult(projektiPaths, LIITE);
    expect(tulos).to.equal(LiitteenSkannausTulos.SAASTUNUT);
  });

  it("should throw when file is missing from both yllapito and quarantine buckets", async () => {
    s3Mock.on(GetObjectTaggingCommand).rejects({ name: "NoSuchKey", message: "NoSuchKey" });
    await expect(virusScanService.getGuardDutyScanResult(projektiPaths, LIITE)).to.eventually.be.rejectedWith(
      "puuttuu sekä ylläpito- että karanteenibucketista"
    );
  });
});
