import { ClientError } from "./ClientError";

export class LoadProjektiYllapitoIllegalAccessError extends ClientError {
  constructor(message: string) {
    super("LoadProjektiYllapitoIllegalAccessError", "LoadProjektiYllapitoIllegalAccessError;" + message);
    // Make the log show LoadProjektiYllapitoIllegalAccessError instead of Error in the stack trace
    Object.setPrototypeOf(this, LoadProjektiYllapitoIllegalAccessError.prototype);
  }
}
