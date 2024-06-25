import { Aineisto, DBProjekti, LadattuTiedosto } from "../../../../src/database/model";
import { SqsEvent, SqsEventType } from "../../../../src/sqsEvents/sqsEvent";
import * as API from "hassu-common/graphql/apiModel";
import sinon from "sinon";
import { handlerFactory } from "../../../../src/sqsEvents/sqsEventHandlerLambda";
import { SQSEvent, SQSRecord } from "aws-lambda";
import { projektiDatabase } from "../../../../src/database/projektiDatabase";
import { parameters } from "../../../../src/aws/parameters";
import GetProjektiStatus from "../../../../src/projekti/status/getProjektiStatus";
import { CreateFileProperties, DeleteFileProperties, PersistFileProperties, fileService } from "../../../../src/files/fileService";
import { eventSqsClient } from "../../../../src/sqsEvents/eventSqsClient";

import * as synchronizeFilesToPublic from "../../../../src/tiedostot/synchronizeFilesToPublic";
import * as zipFiles from "../../../../src/tiedostot/zipFiles";
import { velho } from "../../../../src/velho/velhoClient";
import contentDisposition from "content-disposition";

export function fakeEventInSqsQueue({
  eventType,
  projektiOid,
  uuid,
}: {
  eventType: SqsEventType;
  projektiOid: string;
  uuid?: string;
}): () => Promise<void> {
  const event: SqsEvent = { oid: projektiOid, type: eventType, uuid };
  const sqsRecord: SQSRecord = {
    body: JSON.stringify(event),
    messageId: "",
    receiptHandle: "",
    attributes: {
      ApproximateReceiveCount: "",
      SentTimestamp: "",
      SenderId: "",
      ApproximateFirstReceiveTimestamp: "",
    },
    messageAttributes: {},
    md5OfBody: "",
    eventSource: "",
    eventSourceARN: "",
    awsRegion: "",
  };
  const awsSqsEvent: SQSEvent = {
    Records: [sqsRecord],
  };
  return handlerFactory(awsSqsEvent);
}

export function stubBasics({
  applyProjektiStatusSetStatus,
  loadProjektiByOidReturnValue,
}: {
  applyProjektiStatusSetStatus: API.Status;
  loadProjektiByOidReturnValue: DBProjekti;
}): {
  saveProjektiInternalStub: sinon.SinonStub<[dbProjekti: Partial<DBProjekti> & Pick<DBProjekti, "oid">], Promise<number>>;
  persistFileStub: sinon.SinonStub<[param: PersistFileProperties], Promise<string>> | undefined;
  deleteFileStub: sinon.SinonStub<[DeleteFileProperties], Promise<void>>;
  addEventZipLausuntoPyynnonTaydennysAineistoStub: sinon.SinonStub<[oid: string], Promise<void>>;
  addEventZipLausuntoPyyntoAineistoStub: sinon.SinonStub<[oid: string], Promise<void>>;
  zipFilesStub: sinon.SinonStub<[bucket: string, zipSourceFiles: zipFiles.ZipSourceFile[], zipFileS3Key: string], Promise<void>>;
  velhoGetAineistoStub: sinon.SinonStub<[dokumenttiOid: string], Promise<{ disposition: string; contents: Buffer }>>;
  createAineistoToProjektiStub: sinon.SinonStub<[param: CreateFileProperties], Promise<string>>;
} {
  sinon.stub(projektiDatabase, "loadProjektiByOid").returns(Promise.resolve(loadProjektiByOidReturnValue));
  sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").resolves(false);
  sinon.stub(parameters, "isUspaIntegrationEnabled").resolves(false);
  sinon.stub(GetProjektiStatus, "getProjektiStatus").returns(Promise.resolve(applyProjektiStatusSetStatus));
  sinon.stub(synchronizeFilesToPublic, "synchronizeFilesToPublic").callsFake(() => Promise.resolve(true));
  const saveProjektiInternalStub = sinon.stub(projektiDatabase, "saveProjektiWithoutLocking");
  const persistFileStub = sinon.stub(fileService, "persistFileToProjekti").callsFake((param: PersistFileProperties) => {
    const filePath = param.uploadedFileSource;
    const fileNameFromUpload = filePath.replace(/^\/?[0-9a-z-]+\//, "");
    const targetPath = `/${param.targetFilePathInProjekti}/${fileNameFromUpload}`;
    return Promise.resolve(targetPath);
  });

  const deleteFileStub = sinon.stub(fileService, "deleteYllapitoFileFromProjekti");
  const addEventZipLausuntoPyynnonTaydennysAineistoStub = sinon.stub(eventSqsClient, "zipLausuntoPyynnonTaydennysAineisto");
  const addEventZipLausuntoPyyntoAineistoStub = sinon.stub(eventSqsClient, "zipLausuntoPyyntoAineisto");
  const zipFilesStub = sinon.stub(zipFiles, "generateAndStreamZipfileToS3");
  // Haluaisin oikeasti feikata ProjektiTiedostoManagerin util-funktion importAineisto,
  // mutta se ei tuntunut onnistuvan, joten feikkasin kaiken tarvittavan sen sisältä.
  const velhoGetAineistoStub = sinon.stub(velho, "getAineisto").callsFake(async (dokumenttiOid: string) => ({
    disposition: dokumenttiOid,
    contents: Buffer.from("bar"),
  }));
  sinon.stub(contentDisposition, "parse").callsFake((disposition: string) => ({
    type: "foo",
    parameters: {
      filename: disposition,
    },
  }));
  const createAineistoToProjektiStub = sinon
    .stub(fileService, "createAineistoToProjekti")
    .callsFake(async (params: CreateFileProperties) => Promise.resolve(params.fileName));
  // importAineisto:n sisällä olevien juttujen feikkaus loppuu
  return {
    saveProjektiInternalStub,
    persistFileStub,
    deleteFileStub,
    addEventZipLausuntoPyynnonTaydennysAineistoStub,
    addEventZipLausuntoPyyntoAineistoStub,
    zipFilesStub,
    velhoGetAineistoStub,
    createAineistoToProjektiStub,
  };
}

export function getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa(
  name: string,
  phaseFolder: string,
  kategoriaId?: string
): Aineisto[] {
  return [
    {
      tiedosto: `/${phaseFolder}/${name}_aineisto_valmis.txt`,
      dokumenttiOid: `${name}2`,
      nimi: `${name}_aineisto_valmis.txt`,
      tila: API.AineistoTila.VALMIS,
      jarjestys: 2,
      tuotu: "2021-06-01T01:03",
      kategoriaId,
      uuid: `${kategoriaId ?? "no-category"}1`,
    },
    {
      tiedosto: "",
      //dokumenttiOid vastaa tiedostonimeä, jotta stubbaus-feikkaushommissa saadaan feikattua tiedostonimi halutunlaiseksi
      dokumenttiOid: `/${phaseFolder}/${name}_aineisto_odottaa_tuontia.txt`,
      nimi: `${name}_aineisto_odottaa_tuontia.txt`,
      tila: API.AineistoTila.ODOTTAA_TUONTIA,
      jarjestys: 1,
      kategoriaId,
      uuid: `${kategoriaId ?? "no-category"}2`,
    },
    {
      tiedosto: `/${phaseFolder}/${name}_aineisto_odottaa_poistoa.txt`,
      dokumenttiOid: `${name}1`,
      nimi: `${name}_aineisto_odottaa_poistoa.txt`,
      tila: API.AineistoTila.ODOTTAA_POISTOA,
      jarjestys: 3,
      tuotu: "2021-06-01T01:04",
      kategoriaId,
      uuid: `${kategoriaId ?? "no-category"}3`,
    },
  ];
}

export function getThreeLadattuTiedostosValmisAndOdottaaPersistointiaAndOdottaaPoistoa({
  name,
  lausuntoPyynnonTaydennysUuid,
  lausuntoPyyntoUuid,
}: {
  name: string;
  lausuntoPyynnonTaydennysUuid?: string;
  lausuntoPyyntoUuid?: string;
}): LadattuTiedosto[] {
  if (!lausuntoPyynnonTaydennysUuid && !lausuntoPyyntoUuid) {
    throw new Error("Give either lausuntoPyynnonTaydennysUuid or lausuntoPyyntoUuid");
  }
  const path = lausuntoPyyntoUuid ? "lausuntopyynto" : "lausuntopyynnon_taydennys";
  const uuid = lausuntoPyyntoUuid ?? lausuntoPyynnonTaydennysUuid;
  return [
    {
      tiedosto: `temporary-uploads-file-location/${name}_tiedosto_odottaa_persistointia.txt`,
      nimi: `${name}_tiedosto_odottaa_persistointia.txt`,
      tila: API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
      jarjestys: 2,
      uuid: "1",
    },
    {
      tiedosto: `/${path}/${uuid}/${name}_tiedosto_valmis.txt`,
      nimi: `${name}_tiedosto_valmis.txt`,
      tila: API.LadattuTiedostoTila.VALMIS,
      jarjestys: 1,
      tuotu: "2021-06-01T01:01",
      uuid: "2",
    },
    {
      tiedosto: `/${path}/${uuid}/${name}_tiedosto_odottaa_poistoa.txt`,
      nimi: `${name}_tiedosto_odottaa_poistoa.txt`,
      tila: API.LadattuTiedostoTila.ODOTTAA_POISTOA,
      jarjestys: 3,
      tuotu: "2021-06-01T01:02",
      uuid: "3",
    },
  ];
}
