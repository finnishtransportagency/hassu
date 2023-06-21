import { SystemError } from "./SystemError";

export class VelhoError extends SystemError {
  public status: number;
  public statusText: string;

  constructor(status: number, statusText: string) {
    super("VelhoError", "VelhoError;" + status + ";" + statusText);
    this.status = status;
    this.statusText = statusText;
    // Make the log show VelhoError instead of Error in the stack trace
    Object.setPrototypeOf(this, VelhoError.prototype);
  }
}
