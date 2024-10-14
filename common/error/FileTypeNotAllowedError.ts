export class FileTypeNotAllowedError extends Error {
  public file: File | undefined;
  constructor(message: string, file: File) {
    super(message);
    this.file = file;
    Object.setPrototypeOf(this, FileTypeNotAllowedError.prototype);
  }
}
