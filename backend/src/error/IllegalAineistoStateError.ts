import { ClientError } from "./ClientError";

export class IllegalAineistoStateError extends ClientError {
  constructor() {
    super("IllegalAineistoStateError", "Projektin tilaa ei voi muuttaa ennen kuin aineistot on tuotu. Yritä hetken päästä uudelleen.");

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, IllegalAineistoStateError.prototype);
  }
}
