import { fileService } from "../../src/files/fileService";

export async function cleanProjektiS3Files(oid: string): Promise<void> {
  let files = await fileService.listYllapitoProjektiFiles(oid, "");
  for (const fileName in files) {
    await fileService.deleteYllapitoFileFromProjekti({ oid, fullFilePathInProjekti: "/" + fileName });
  }

  files = await fileService.listPublicProjektiFiles(oid, "");
  for (const fileName in files) {
    await fileService.deletePublicFileFromProjekti({ oid, fullFilePathInProjekti: "/" + fileName });
  }
}
