export enum EmailEventType {
  UUDET_PALAUTTEET_DIGEST = "UUDET_PALAUTTEET_DIGEST",
  MIELIPIDE_KIRJAAMO = "MIELIPIDE_KIRJAAMO",
}

export type MielipideKirjaamoEmailEvent = {
  type: EmailEventType.MIELIPIDE_KIRJAAMO;
  oid: string;
  mielipideId: string;
};

export type EmailEvent = { type: EmailEventType.UUDET_PALAUTTEET_DIGEST } | MielipideKirjaamoEmailEvent;
