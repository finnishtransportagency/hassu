import { ClientError } from "./ClientError";

export class IllegalProjektiStateError extends ClientError {
  constructor(m?: string) {
    super("IllegalProjektiStateError", m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, IllegalProjektiStateError.prototype);
  }
}
