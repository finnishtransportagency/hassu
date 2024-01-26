export class UnsupportedGeometryTypeError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "UnsupportedGeometryTypeError";
    Object.setPrototypeOf(this, UnsupportedGeometryTypeError.prototype);
  }
}
