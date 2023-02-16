export interface CFResponse {
  readonly headers: Record<string, Record<string, { value: string }>[]>;
  readonly status: number;
  readonly statusText: string;
}
