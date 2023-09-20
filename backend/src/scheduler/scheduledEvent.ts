export enum ScheduledEventType {
  IMPORT = "IMPORT",
  SYNCHRONIZE = "SYNCHRONIZE",
  END_NAHTAVILLAOLO_AINEISTOMUOKKAUS = "END_NAHTAVILLAOLO_AINEISTOMUOKKAUS",
  END_HYVAKSYMISPAATOS_AINEISTOMUOKKAUS = "END_END_HYVAKSYMISPAATOS_AINEISTOMUOKKAUS",
  END_JATKOPAATOS1_AINEISTOMUOKKAUS = "END_JATKOPAATOS1_AINEISTOMUOKKAUS",
  END_JATKOPAATOS2_AINEISTOMUOKKAUS = "END_JATKOPAATOS2_AINEISTOMUOKKAUS",
}

export type ScheduledEvent = {
  type: ScheduledEventType;
  oid: string;
  scheduleName?: string;
  retriesLeft?: number;
  reason?: string;
};
