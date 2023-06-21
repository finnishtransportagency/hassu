import { SystemError } from "./SystemError";

export class VelhoUnavailableError extends SystemError {
  public status: number;
  public statusText: string;

  constructor(status: number, statusText: string) {
    super("VelhoUnavailableError", "VelhoUnavailableError;" + status + ";" + statusText);
    this.status = status;
    this.statusText = statusText;
    // Make the log show VelhoError instead of Error in the stack trace
    Object.setPrototypeOf(this, VelhoUnavailableError.prototype);
  }
}
