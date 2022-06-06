export class ClientError extends Error {
  public readonly className: string;

  constructor(className: string, m: string | undefined) {
    super(m ? m : "");
    this.className = className;

    Object.setPrototypeOf(this, ClientError.prototype);
  }
}
