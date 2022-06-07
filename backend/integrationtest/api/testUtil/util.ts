import { cleanupGeneratedIds } from "./cleanUpFunctions";
import { fileService } from "../../../src/files/fileService";
const { expect } = require("chai");

export async function takeS3Snapshot(oid: string, description: string): Promise<void> {
  expect({
    ["yllapito S3 files " + description]: cleanupGeneratedIds(await fileService.listYllapitoProjektiFiles(oid, "")),
  }).toMatchSnapshot(description);
  expect({
    ["public S3 files " + description]: cleanupGeneratedIds(await fileService.listPublicProjektiFiles(oid, "", true)),
  }).toMatchSnapshot(description);
}

export function expectToMatchSnapshot(description: string, obj: unknown): void {
  expect({ description, obj }).toMatchSnapshot();
}
