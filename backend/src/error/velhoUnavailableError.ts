import { SystemError } from "./SystemError";

export class VelhoUnavailableError extends SystemError {
  constructor(status: number, statusText: string) {
    super("VelhoUnavailableError", "VelhoUnavailableError;" + status + " " + statusText);
    // Make the log show VelhoError instead of Error in the stack trace
    Object.setPrototypeOf(this, VelhoUnavailableError.prototype);
  }
}
