import { ClientError } from "./ClientError";

export class AineistoMuokkausError extends ClientError {
  constructor(m?: string) {
    super("AineistoMuokkausError", m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, AineistoMuokkausError.prototype);
  }
}
