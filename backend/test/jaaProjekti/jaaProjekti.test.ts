import { describe, it } from "mocha";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { UserFixture } from "../fixture/userFixture";
import { expect } from "chai";
import { DBProjekti, Palaute, Velho } from "../../src/database/model";
import { jaaProjekti } from "../../src/jaaProjekti";
import { IllegalArgumentError } from "hassu-common/error";
import { userService } from "../../src/user";
import { DBProjektiForSpecificVaiheFixture, VaiheenTila } from "../fixture/DBProjekti2ForSecificVaiheFixture";
import { Kayttaja, Vaihe } from "hassu-common/graphql/apiModel";
import { cloneDeep } from "lodash";
import { velho as velhoClient } from "../../src/velho/velhoClient";
import {
  DynamoDBDocumentClient,
  DynamoDBDocumentClientResolvedConfig,
  PutCommandOutput,
  ServiceInputTypes as DynamoDBServiceInputTypes,
  ServiceOutputTypes as DynamoDBServiceOutputTypes,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import { AwsStub, mockClient } from "aws-sdk-client-mock";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
  S3ClientResolvedConfig,
  ServiceInputTypes as S3ServiceInputTypes,
  ServiceOutputTypes as S3ServiceOutputTypes,
} from "@aws-sdk/client-s3";
import { ProjektiPaths } from "../../src/files/ProjektiPath";
import { lisaAineistoService } from "../../src/tiedostot/lisaAineistoService";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { parameters } from "../../src/aws/parameters";
import { DBMuistuttaja, muistuttajaDatabase } from "../../src/database/muistuttajaDatabase";
import { feedbackDatabase } from "../../src/database/palauteDatabase";
import { uuid } from "hassu-common/util/uuid";

describe("jaaProjekti", () => {
  const userFixture = new UserFixture(userService);

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("should throw error if user is not authenticted", async () => {
    await expect(jaaProjekti({ oid: "oid-123", versio: 1, targetOid: "toinen-oid-234" })).to.eventually.be.rejectedWith(
      Error,
      "Väylä-kirjautuminen puuttuu"
    );
  });

  it("should throw error if user not admin", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await expect(jaaProjekti({ oid: "oid-123", versio: 1, targetOid: "toinen-oid-234" })).to.eventually.be.rejectedWith(
      Error,
      "Sinulla ei ole admin-oikeuksia"
    );
  });

  it("should throw error if VLS-projekti does not exist with oid", async () => {
    userFixture.loginAs(UserFixture.hassuAdmin);
    const oid = "oid-123";
    sinon.stub(projektiDatabase, "loadProjektiByOid").returns(Promise.resolve(undefined));
    await expect(jaaProjekti({ oid, versio: 1, targetOid: "toinen-oid-234" })).to.eventually.be.rejectedWith(
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
    await expect(
      jaaProjekti({ oid: srcProjekti.oid, versio: srcProjekti.versio, targetOid: targetProjekti.oid })
    ).to.eventually.be.rejectedWith(IllegalArgumentError, `Kohde projekti oid:lla '${targetProjekti.oid}' on jo VLS-järjestelmässä`);
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
    await expect(
      jaaProjekti({ oid: srcProjekti.oid, versio: srcProjekti.versio, targetOid: targetProjektiOid })
    ).to.eventually.be.rejectedWith(Error, `Kohde projektia oid:lla '${targetProjektiOid}' ei löydy Projektivelhosta`);
  });

  describe("with admin user and correct parameters", () => {
    let srcProjekti: DBProjekti;
    const targetProjektiOid = "toinen-oid";
    let createProjektiStub: sinon.SinonStub<[projekti: DBProjekti], Promise<PutCommandOutput>>;
    let dynamoDBClient: AwsStub<DynamoDBServiceInputTypes, DynamoDBServiceOutputTypes, DynamoDBDocumentClientResolvedConfig>;

    let targetVelho: Velho;
    let targetProjektiFromVelho: DBProjekti;
    let s3Mock: AwsStub<S3ServiceInputTypes, S3ServiceOutputTypes, S3ClientResolvedConfig>;
    let uuidStub: sinon.SinonStub<[], string>;

    let getKayttajasStub: sinon.SinonStub;
    let a1User: Kayttaja;
    let a2User: Kayttaja;
    let x1User: Kayttaja;
    let srcMuistuttajat: DBMuistuttaja[];
    let srcFeedback: Palaute[];

    beforeEach(() => {
      sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
      sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
      uuidStub = sinon.stub(uuid, "v4");
      const personSearchFixture = new PersonSearchFixture();
      a1User = personSearchFixture.createKayttaja("A1");
      a2User = personSearchFixture.createKayttaja("A2");
      x1User = personSearchFixture.createKayttaja("X1");
      getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
      getKayttajasStub.resolves(Kayttajas.fromKayttajaList([a1User, a2User, x1User]));
      userFixture.loginAs(UserFixture.hassuAdmin);
      srcProjekti = new DBProjektiForSpecificVaiheFixture().getProjektiForVaihe(Vaihe.NAHTAVILLAOLO, VaiheenTila.LUONNOS);
      createProjektiStub = sinon.stub(projektiDatabase, "createProjekti");
      sinon
        .stub(projektiDatabase, "loadProjektiByOid")
        .withArgs(srcProjekti.oid)
        .returns(Promise.resolve(srcProjekti))
        .withArgs(targetProjektiOid)
        .returns(Promise.resolve(undefined));
      sinon.stub(lisaAineistoService, "generateSalt").returns("foo-salt");
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
      dynamoDBClient = mockClient(DynamoDBDocumentClient);
      srcMuistuttajat = [{ id: "123", expires: 123, lisatty: "2022-01-01", oid: srcProjekti.oid }];
      srcFeedback = [{ id: "123", vastaanotettu: "2022-01-01", oid: srcProjekti.oid }];
      sinon.stub(muistuttajaDatabase, "haeProjektinKaytossaolevatMuistuttajat").returns(Promise.resolve(srcMuistuttajat));
      sinon.stub(feedbackDatabase, "listFeedback").returns(Promise.resolve(srcFeedback));
    });

    afterEach(() => {
      s3Mock.reset();
    });

    it("should copy projekti's fields and mark each julkaisu as copied", async () => {
      await expect(jaaProjekti({ oid: srcProjekti.oid, versio: srcProjekti.versio, targetOid: targetProjektiOid })).to.eventually.be
        .fulfilled;
      expect(createProjektiStub.calledOnce).to.be.true;
      const targetProjektiToCreate = createProjektiStub.firstCall.args[0];
      expect(targetProjektiToCreate).toMatchSnapshot();
      expect(targetProjektiToCreate.oid).to.equal(targetProjektiOid);
      expect(targetProjektiToCreate.velho).to.eql(targetVelho);
      expect(targetProjektiToCreate.salt).to.equal("foo-salt");
      expect(targetProjektiToCreate.kayttoOikeudet).to.eql([
        {
          elyOrganisaatio: undefined,
          email: "pekka.projari@vayla.fi",
          etunimi: "Pekka",
          kayttajatunnus: "A123",
          muokattavissa: false,
          organisaatio: "Väylävirasto",
          puhelinnumero: "123456789",
          sukunimi: "Projari",
          tyyppi: "PROJEKTIPAALLIKKO",
        },
        {
          elyOrganisaatio: undefined,
          email: "Matti.Meikalainen@vayla.fi",
          etunimi: "Matti",
          kayttajatunnus: "A000111",
          muokattavissa: true,
          organisaatio: "Väylävirasto",
          puhelinnumero: "123456789",
          sukunimi: "Meikalainen",
        },
      ]);
      expect(targetProjektiToCreate.aloitusKuulutusJulkaisut?.length).to.equal(1);
      expect(targetProjektiToCreate.aloitusKuulutusJulkaisut?.[0].kopioituProjektista).to.equal(srcProjekti.oid);
      expect(targetProjektiToCreate.vuorovaikutusKierrosJulkaisut?.length).to.equal(1);
      expect(targetProjektiToCreate.vuorovaikutusKierrosJulkaisut?.[0].kopioituProjektista).to.equal(srcProjekti.oid);
      expect(targetProjektiToCreate.nahtavillaoloVaiheJulkaisut).to.be.undefined;
      expect(targetProjektiToCreate.projektinJakautuminen?.jaettuProjektista).to.eql(srcProjekti.oid);
      expect(targetProjektiToCreate.projektinJakautuminen?.jaettuProjekteihin).to.eql(undefined);

      const updateCommands = dynamoDBClient.commandCalls(UpdateCommand);
      expect(updateCommands.length).to.equal(1);
      const input = updateCommands[0].args[0].input;
      expect(input).to.eql({
        ConditionExpression: "(attribute_not_exists(versio) OR versio = :versio) AND attribute_not_exists(projektinJakautuminen)",
        ExpressionAttributeValues: {
          ":projektinJakautuminen": {
            jaettuProjekteihin: [targetProjektiOid],
          },
          ":one": 1,
          ":versio": 1,
        },
        Key: {
          oid: "2",
        },
        TableName: "Projekti-localstack",
        UpdateExpression: "ADD versio :one SET projektinJakautuminen = :projektinJakautuminen",
      });
    });

    it("should copy all srcProjekti's s3objects to targetProjekti's path", async () => {
      await expect(jaaProjekti({ oid: srcProjekti.oid, versio: srcProjekti.versio, targetOid: targetProjektiOid })).to.eventually.be
        .fulfilled;
      expect(s3Mock.calls().length).to.equal(4);
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
      const deleteObjectCommands = s3Mock.commandCalls(DeleteObjectCommand);
      expect(deleteObjectCommands[0].args[0].input).to.eql({
        Bucket: "hassu-localstack-yllapito",
        Key: "yllapito/tiedostot/projekti/toinen-oid/karttarajaus/karttarajaus.geojson",
      });
    });

    it("should copy muistuttajat and palautteet", async () => {
      uuidStub.onFirstCall().returns("1");
      uuidStub.onSecondCall().returns("2");
      await expect(jaaProjekti({ oid: srcProjekti.oid, versio: srcProjekti.versio, targetOid: targetProjektiOid })).to.eventually.be
        .fulfilled;
      const updateCommands = dynamoDBClient.commandCalls(TransactWriteCommand);
      expect(updateCommands.length).to.equal(2);
      const tallennettuMuistuttaja = updateCommands[0].args[0].input.TransactItems?.[0].Put?.Item;
      expect(tallennettuMuistuttaja).to.eql({ ...srcMuistuttajat[0], oid: targetProjektiOid, id: "1" });
      const tallennettuPalaute = updateCommands[1].args[0].input.TransactItems?.[0].Put?.Item;
      expect(tallennettuPalaute).to.eql({ ...srcFeedback[0], oid: targetProjektiOid, id: "2" });
    });
  });
});
