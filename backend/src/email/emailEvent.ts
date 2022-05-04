export enum EmailEventType {
  UUDET_PALAUTTEET_DIGEST = "UUDET_PALAUTTEET_DIGEST",
}

export type EmailEvent = {
  type: EmailEventType;
};
