import { SystemError } from "./SystemError";

export class VelhoGeoJsonSizeExceededError extends SystemError {
  constructor(message: string) {
    super("VelhoGeoJsonSizeExceededError", message);

    // Make the log show VelhoGeoJsonSizeExceededError instead of Error in the stack trace
    Object.setPrototypeOf(this, VelhoGeoJsonSizeExceededError.prototype);
  }
}
