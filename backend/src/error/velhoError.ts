import { SystemError } from "./SystemError";

export class VelhoError extends SystemError {
  constructor(m?: string, error?: any) {
    super("VelhoError", m ? m + (error?.response?.data ? JSON.stringify(error.response?.data) : "") : "");

    // Make the log show VelhoError instead of Error in the stack trace
    Object.setPrototypeOf(this, VelhoError.prototype);
  }
}
