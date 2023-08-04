import { ClientError } from "./ClientError";

export class ProjektiIllegalAccessError extends ClientError {
  constructor(message: string) {
    super("ProjektiIllegalAccessError", "ProjektiIllegalAccessError;" + message);
    // Make the log show ProjektiIllegalAccessError instead of Error in the stack trace
    Object.setPrototypeOf(this, ProjektiIllegalAccessError.prototype);
  }
}
