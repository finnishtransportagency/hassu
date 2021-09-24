export class VelhoError extends Error {
  constructor(m?: string) {
    super(m ? m : "");

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, VelhoError.prototype);
  }
}
