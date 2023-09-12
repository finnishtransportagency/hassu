import { ClientError } from "./ClientError";

export class SimultaneousUpdateError extends ClientError {
  constructor(m?: string) {
    super("SimultaneousUpdateError", m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, SimultaneousUpdateError.prototype);
  }
}
