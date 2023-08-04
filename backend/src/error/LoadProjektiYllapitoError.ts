import { ClientError } from "./ClientError";

export class LoadProjektiYllapitoError extends ClientError {
  constructor(message: string) {
    super("LoadProjektiYllapitoError", "LoadProjektiYllapitoError;" + message);
    // Make the log show LoadProjektiYllapitoError instead of Error in the stack trace
    Object.setPrototypeOf(this, LoadProjektiYllapitoError.prototype);
  }
}
