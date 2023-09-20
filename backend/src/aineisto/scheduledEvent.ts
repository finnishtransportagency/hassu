export enum ScheduledEventType {
  IMPORT = "IMPORT",
  SYNCHRONIZE = "SYNCHRONIZE",
  END_AINEISTOMUOKKAUS = "END_AINEISTOMUOKKAUS",
}

export type ScheduledEvent = {
  type: ScheduledEventType;
  oid: string;
  scheduleName?: string;
  retriesLeft?: number;
  reason?: string;
};
