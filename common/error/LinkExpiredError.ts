import { ClientError } from "./ClientError";

export class LinkExpiredError extends ClientError {
  constructor(m?: string) {
    super("LinkExpiredError", m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, LinkExpiredError.prototype);
  }
}
