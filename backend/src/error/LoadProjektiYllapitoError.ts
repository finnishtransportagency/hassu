import { ClientError } from "./ClientError";

export class LoadProjektiYllapitoError extends ClientError {
  constructor(message: string) {
    super("LoadProjektiYllapitoError", message);
    Object.setPrototypeOf(this, LoadProjektiYllapitoError.prototype);
  }
}
