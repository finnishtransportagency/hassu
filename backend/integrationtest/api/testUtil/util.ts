import { cleanupGeneratedIds } from "./cleanUpFunctions";
import { fileService } from "../../../src/files/fileService";
import { AineistoInput, VelhoAineisto } from "../../../../common/graphql/apiModel";
import { loadProjektiJulkinenFromDatabase } from "./tests";
import { UserFixture } from "../../../test/fixture/userFixture";
import * as sinon from "sinon";
import { pdfGeneratorClient } from "../../../src/asiakirja/lambda/pdfGeneratorClient";
import { handleEvent as pdfGenerator } from "../../../src/asiakirja/lambda/pdfGeneratorHandler";
import { velho } from "../../../src/velho/velhoClient";
import mocha from "mocha";
import { NotFoundError } from "../../../src/error/NotFoundError";

const { expect } = require("chai");

export async function takeS3Snapshot(oid: string, description: string, path?: string): Promise<void> {
  await takeYllapitoS3Snapshot(oid, description, path);
  await takePublicS3Snapshot(oid, description, path);
}

export async function takeYllapitoS3Snapshot(oid: string, description: string, path?: string): Promise<void> {
  expect({
    ["yllapito S3 files " + description]: cleanupGeneratedIds(await fileService.listYllapitoProjektiFiles(oid, path || "")),
  }).toMatchSnapshot(description);
}

export async function takePublicS3Snapshot(oid: string, description: string, path?: string): Promise<void> {
  expect({
    ["public S3 files " + description]: cleanupGeneratedIds(await fileService.listPublicProjektiFiles(oid, path || "", true)),
  }).toMatchSnapshot(description);
}

export function expectToMatchSnapshot(description: string, obj: unknown): void {
  expect({ description, obj }).toMatchSnapshot();
}

export function adaptAineistoToInput(aineistot: VelhoAineisto[]): AineistoInput[] {
  return aineistot
    .map((aineisto, index) => {
      const { oid: dokumenttiOid, tiedosto: nimi, kategoriaId } = aineisto;
      return { kategoriaId, jarjestys: index + 1, nimi, dokumenttiOid };
    })
    .slice(0, 5); // Optimization: don't copy all files
}

export function expectApiError(e: Error, message: string): void {
  const contents = JSON.parse(e.message);
  expect(contents.message).to.eq(message);
}

export async function expectJulkinenNotFound(oid: string, userFixture: UserFixture): Promise<void> {
  userFixture.logout();
  await expect(loadProjektiJulkinenFromDatabase(oid)).to.eventually.be.rejectedWith(NotFoundError);
  userFixture.loginAs(UserFixture.mattiMeikalainen);
}

export function stubPDFGenerator(): void {
  const pdfGeneratorLambdaStub = sinon.stub(pdfGeneratorClient, "generatePDF");
  pdfGeneratorLambdaStub.callsFake(async (event) => {
    return await pdfGenerator(event);
  });
}

export function mockSaveProjektiToVelho(): void {
  const stub = sinon.stub(velho, "saveProjekti");
  mocha.afterEach(() => {
    if (stub.getCalls().length > 0) {
      expect({
        "velho.saveProjekti": stub.getCalls().map((call) => call.args),
      }).toMatchSnapshot();
    }
    stub.reset();
  });
}
