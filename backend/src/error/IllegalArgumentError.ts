import { ClientError } from "./ClientError";

export class IllegalArgumentError extends ClientError {
  constructor(m?: string) {
    super("IllegalArgumentError", m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, IllegalArgumentError.prototype);
  }
}
