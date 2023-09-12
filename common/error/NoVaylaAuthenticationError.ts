import { ClientError } from "./ClientError";

export class NoVaylaAuthenticationError extends ClientError {
  constructor(m?: string) {
    super("NoVaylaAuthenticationError", m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, NoVaylaAuthenticationError.prototype);
  }
}
