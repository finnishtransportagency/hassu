import { Dokumentti } from "@hassu/asianhallinta";
import { PathTuple } from "../../files/ProjektiPath";
import { fileService } from "../../files/fileService";

export class S3Paths {
  private readonly pathTuple: PathTuple;
  private readonly s3Paths: string[];

  constructor(pathTuple: PathTuple) {
    this.pathTuple = pathTuple;
    this.s3Paths = [];
  }

  pushYllapitoFilesIfDefined(...filePaths: (string | undefined | null)[]) {
    if (filePaths) {
      filePaths.forEach((filePath) => {
        if (filePath) {
          this.s3Paths.push(fileService.getYllapitoPathForProjektiFile(this.pathTuple, filePath));
        }
      });
    }
  }

  getDokumentit(): Dokumentti[] {
    return this.s3Paths.map((path) => ({ s3Path: path }));
  }
}
