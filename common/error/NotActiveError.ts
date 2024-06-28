import { ClientError } from "./ClientError";

export class NotActiveError extends ClientError {
  constructor(m?: string) {
    super("NotActiveError", m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, NotActiveError.prototype);
  }
}
