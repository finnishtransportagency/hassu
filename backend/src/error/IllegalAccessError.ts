import { ClientError } from "./ClientError";

export class IllegalAccessError extends ClientError {
  constructor(m?: string) {
    super("IllegalAccessError", m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, IllegalAccessError.prototype);
  }
}
