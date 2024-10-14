export class FileSizeExceededLimitError extends Error {
  public file: File | undefined;
  constructor(message: string, file: File) {
    super(message);
    this.file = file;
    Object.setPrototypeOf(this, FileSizeExceededLimitError.prototype);
  }
}
