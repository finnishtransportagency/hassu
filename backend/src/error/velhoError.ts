import { SystemError } from "./SystemError";

export class VelhoError extends SystemError {
  public status;

  constructor(status?: number) {
    super("VelhoError", "VelhoError " + status);
    this.status = status;

    // Make the log show VelhoError instead of Error in the stack trace
    Object.setPrototypeOf(this, VelhoError.prototype);
  }
}
