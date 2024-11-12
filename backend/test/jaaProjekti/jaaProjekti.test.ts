import { describe, it } from "mocha";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { UserFixture } from "../fixture/userFixture";
import { expect } from "chai";
import { DBProjekti, Velho } from "../../src/database/model";
import { jaaProjekti } from "../../src/jaaProjekti";
import { IllegalArgumentError } from "hassu-common/error";
import { userService } from "../../src/user";
import { DBProjektiForSpecificVaiheFixture, VaiheenTila } from "../fixture/DBProjekti2ForSecificVaiheFixture";
import { Vaihe } from "hassu-common/graphql/apiModel";
import { cloneDeep } from "lodash";
import { velho as velhoClient } from "../../src/velho/velhoClient";
import { PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import { AwsStub, mockClient } from "aws-sdk-client-mock";
import {
  CopyObjectCommand,
  ListObjectsV2Command,
  S3Client,
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "@aws-sdk/client-s3";
import { ProjektiPaths } from "../../src/files/ProjektiPath";

describe("jaaProjekti", () => {
  const userFixture = new UserFixture(userService);

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("should throw error if user is not authenticted", async () => {
    await expect(jaaProjekti({ oid: "oid-123", targetOid: "toinen-oid-234" })).to.eventually.be.rejectedWith(
      Error,
      "Väylä-kirjautuminen puuttuu"
    );
  });

  it("should throw error if user not admin", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await expect(jaaProjekti({ oid: "oid-123", targetOid: "toinen-oid-234" })).to.eventually.be.rejectedWith(
      Error,
      "Sinulla ei ole admin-oikeuksia"
    );
  });

  it("should throw error if VLS-projekti does not exist with oid", async () => {
    userFixture.loginAs(UserFixture.hassuAdmin);
    const oid = "oid-123";
    sinon.stub(projektiDatabase, "loadProjektiByOid").returns(Promise.resolve(undefined));
    await expect(jaaProjekti({ oid, targetOid: "toinen-oid-234" })).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      `Jaettavaa projektia ei löydy oid:lla '${oid}'`
    );
  });

  it("should throw error if VLS-projekti already exists with targetOid", async () => {
    userFixture.loginAs(UserFixture.hassuAdmin);
    const srcProjekti = new DBProjektiForSpecificVaiheFixture().getProjektiForVaihe(Vaihe.NAHTAVILLAOLO, VaiheenTila.LUONNOS);
    const targetProjekti: DBProjekti = { ...cloneDeep(srcProjekti), oid: "toinen-oid" };
    sinon
      .stub(projektiDatabase, "loadProjektiByOid")
      .withArgs(srcProjekti.oid)
      .returns(Promise.resolve(srcProjekti))
      .withArgs(targetProjekti.oid)
      .returns(Promise.resolve(targetProjekti));
    await expect(jaaProjekti({ oid: srcProjekti.oid, targetOid: targetProjekti.oid })).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      `Kohde projekti oid:lla '${targetProjekti.oid}' on jo VLS-järjestelmässä`
    );
  });

  it("should throw error if Velho-projekti does not exist with targetOid", async () => {
    userFixture.loginAs(UserFixture.hassuAdmin);
    const srcProjekti = new DBProjektiForSpecificVaiheFixture().getProjektiForVaihe(Vaihe.NAHTAVILLAOLO, VaiheenTila.LUONNOS);
    const targetProjektiOid = "toinen-oid";
    sinon
      .stub(projektiDatabase, "loadProjektiByOid")
      .withArgs(srcProjekti.oid)
      .returns(Promise.resolve(srcProjekti))
      .withArgs(targetProjektiOid)
      .returns(Promise.resolve(undefined));
    const targetProjektiFromVelho: DBProjekti = {
      oid: targetProjektiOid,
      versio: 1,
      kayttoOikeudet: [],
    };
    sinon.stub(velhoClient, "loadProjekti").withArgs(targetProjektiOid).returns(Promise.resolve(targetProjektiFromVelho));
    await expect(jaaProjekti({ oid: srcProjekti.oid, targetOid: targetProjektiOid })).to.eventually.be.rejectedWith(
      Error,
      `Kohde projektia oid:lla '${targetProjektiOid}' ei löydy Projektivelhosta`
    );
  });

  describe("with admin user and correct parameters", () => {
    let srcProjekti: DBProjekti;
    const targetProjektiOid = "toinen-oid";
    let createProjektiStub: sinon.SinonStub<[projekti: DBProjekti], Promise<PutCommandOutput>>;
    let targetVelho: Velho;
    let targetProjektiFromVelho: DBProjekti;
    let s3Mock: AwsStub<ServiceInputTypes, ServiceOutputTypes, S3ClientResolvedConfig>;

    beforeEach(() => {
      userFixture.loginAs(UserFixture.hassuAdmin);
      srcProjekti = new DBProjektiForSpecificVaiheFixture().getProjektiForVaihe(Vaihe.NAHTAVILLAOLO, VaiheenTila.LUONNOS);
      createProjektiStub = sinon.stub(projektiDatabase, "createProjekti");
      sinon
        .stub(projektiDatabase, "loadProjektiByOid")
        .withArgs(srcProjekti.oid)
        .returns(Promise.resolve(srcProjekti))
        .withArgs(targetProjektiOid)
        .returns(Promise.resolve(undefined));
      targetVelho = { ...cloneDeep(srcProjekti.velho), nimi: "Toinen-oid projektin nimi" };
      targetProjektiFromVelho = {
        oid: targetProjektiOid,
        versio: 1,
        velho: targetVelho,
        kayttoOikeudet: [],
      };
      sinon.stub(velhoClient, "loadProjekti").withArgs(targetProjektiOid).returns(Promise.resolve(targetProjektiFromVelho));
      s3Mock = mockClient(S3Client);
      s3Mock
        .on(ListObjectsV2Command, {
          Prefix: "yllapito/tiedostot/projekti/2",
          Bucket: "hassu-localstack-yllapito",
        })
        .resolves({
          Contents: [
            { Key: new ProjektiPaths(srcProjekti.oid).sijaintitieto().yllapitoFullPath },
            { Key: "yllapito/tiedostot/projekti/2/syva/tiedosto/polku/tiedosto.json" },
          ],
        });
      s3Mock.on(CopyObjectCommand).resolves({});
    });

    afterEach(() => {
      s3Mock.reset();
    });

    it("should copy projekti's fields and mark each julkaisu as copied", async () => {
      await expect(jaaProjekti({ oid: srcProjekti.oid, targetOid: targetProjektiOid })).to.eventually.be.fulfilled;
      expect(createProjektiStub.calledOnce).to.be.true;
      const targetProjektiToCreate = createProjektiStub.firstCall.args[0];
      expect(targetProjektiToCreate).toMatchSnapshot();
      expect(targetProjektiToCreate.oid).to.equal(targetProjektiOid);
      expect(targetProjektiToCreate.velho).to.eql(targetVelho);
      expect(targetProjektiToCreate.salt).to.equal(undefined);
      expect(targetProjektiToCreate.kayttoOikeudet).to.eql([]);
      expect(targetProjektiToCreate.aloitusKuulutusJulkaisut?.length).to.equal(1);
      expect(targetProjektiToCreate.aloitusKuulutusJulkaisut?.[0].kopioituToiseltaProjektilta).to.be.true;
      expect(targetProjektiToCreate.vuorovaikutusKierrosJulkaisut?.length).to.equal(1);
      expect(targetProjektiToCreate.vuorovaikutusKierrosJulkaisut?.[0].kopioituToiseltaProjektilta).to.be.true;
      expect(targetProjektiToCreate.nahtavillaoloVaiheJulkaisut).to.be.undefined;
    });

    it("should copy all objects from srcProjekti's s3 to targetProjekti's ", async () => {
      await expect(jaaProjekti({ oid: srcProjekti.oid, targetOid: targetProjektiOid })).to.eventually.be.fulfilled;
      expect(s3Mock.calls().length).to.equal(3);
      const listObjectCommands = s3Mock.commandCalls(ListObjectsV2Command);
      expect(listObjectCommands.length).to.equal(1);
      expect(listObjectCommands[0].args[0].input).to.eql({
        Prefix: `yllapito/tiedostot/projekti/${srcProjekti.oid}`,
        Bucket: "hassu-localstack-yllapito",
      });
      const copyObjectCommands = s3Mock.commandCalls(CopyObjectCommand);
      expect(copyObjectCommands.length).to.equal(2);
      expect(copyObjectCommands[0].args[0].input).to.eql({
        Bucket: "hassu-localstack-yllapito",
        ChecksumAlgorithm: "CRC32",
        CopySource: "hassu-localstack-yllapito%2Fyllapito%2Ftiedostot%2Fprojekti%2F2%2Fsijaintitieto",
        Key: "yllapito/tiedostot/projekti/toinen-oid/sijaintitieto",
      });
      expect(copyObjectCommands[1].args[0].input).to.eql({
        Bucket: "hassu-localstack-yllapito",
        ChecksumAlgorithm: "CRC32",
        CopySource: "hassu-localstack-yllapito%2Fyllapito%2Ftiedostot%2Fprojekti%2F2%2Fsyva%2Ftiedosto%2Fpolku%2Ftiedosto.json",
        Key: "yllapito/tiedostot/projekti/toinen-oid/syva/tiedosto/polku/tiedosto.json",
      });
    });
  });
});
