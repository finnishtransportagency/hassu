import { ClientError } from "./ClientError";

export class SaveProjektiYllapitoError extends ClientError {
  constructor(message: string) {
    super("SaveProjektiYllapitoError", "SaveProjektiYllapitoError;" + message);
    // Make the log show SaveProjektiYllapitoError instead of Error in the stack trace
    Object.setPrototypeOf(this, SaveProjektiYllapitoError.prototype);
  }
}
