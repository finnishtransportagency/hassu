export class GeometryExceedsAreaLimitError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "GeometryExceedsAreaLimitError";
    Object.setPrototypeOf(this, GeometryExceedsAreaLimitError.prototype);
  }
}
