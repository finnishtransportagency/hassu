export enum ScheduledEventType {
  IMPORT = "IMPORT",
  SYNCHRONIZE = "SYNCHRONIZE",
}

export type ScheduledEvent = {
  type: ScheduledEventType;
  oid: string;
  scheduleName?: string;
  retriesLeft?: number;
  reason?: string;
};
