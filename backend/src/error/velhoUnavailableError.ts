import { SystemError } from "./SystemError";

export class VelhoUnavailableError extends SystemError {
  public status: number;

  constructor(status: number) {
    super("VelhoUnavailableError", "VelhoUnavailableError " + status);
    this.status = status;
    // Make the log show VelhoError instead of Error in the stack trace
    Object.setPrototypeOf(this, VelhoUnavailableError.prototype);
  }
}
