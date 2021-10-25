export class VelhoError extends Error {
  constructor(m?: string, error?: any) {
    super(m ? m + (error.response?.data ? JSON.stringify(error.response?.data) : "") : "");

    // Make the log show VelhoError instead of Error in the stack trace
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
