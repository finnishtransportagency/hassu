import { SystemError } from "./SystemError";

export class VelhoError extends SystemError {
  constructor(status: number, statusText: string) {
    super("VelhoError", "VelhoError;" + status + " " + statusText);
    // Make the log show VelhoError instead of Error in the stack trace
    Object.setPrototypeOf(this, VelhoError.prototype);
  }
}
