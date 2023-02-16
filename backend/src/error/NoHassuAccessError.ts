import { ClientError } from "./ClientError";

export class NoHassuAccessError extends ClientError {
  constructor(m?: string) {
    super("NoHassuAccessError", m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, NoHassuAccessError.prototype);
  }
}
