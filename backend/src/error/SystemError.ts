export class SystemError extends Error {
  public readonly className: string;

  constructor(className: string, m: string | undefined) {
    super(m ? m : "");
    this.className = className;

    Object.setPrototypeOf(this, SystemError.prototype);
  }
}
