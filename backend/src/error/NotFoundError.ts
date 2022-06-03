import { ClientError } from "./ClientError";

export class NotFoundError extends ClientError {
  constructor(m?: string) {
    super("NotFoundError", m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
