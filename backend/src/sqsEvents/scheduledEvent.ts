import { SqsEventType } from "./sqsEvent";

export type ScheduledEvent = {
  type: SqsEventType;
  oid: string;
  scheduleName?: string;
  retriesLeft?: number;
  reason?: string;
  date?: string;
};
