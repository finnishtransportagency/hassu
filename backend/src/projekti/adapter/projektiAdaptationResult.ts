import { DBProjekti } from "../../database/model";

export enum ProjektiEventType {
  VUOROVAIKUTUS_PUBLISHED = "VUOROVAIKUTUS_PUBLISHED",
  AINEISTO_CHANGED = "AINEISTO_CHANGED",
  RESET_KAYTTOOIKEUDET = "RESET_KAYTTOOIKEUDET",
}

export type VuorovaikutusPublishedEvent = {
  eventType: ProjektiEventType.VUOROVAIKUTUS_PUBLISHED;
  vuorovaikutusNumero: number;
};

export type AineistoChangedEvent = { eventType: ProjektiEventType.AINEISTO_CHANGED };
export type ResetKayttooikeudetEvent = { eventType: ProjektiEventType.RESET_KAYTTOOIKEUDET };

export type ProjektiEvent = VuorovaikutusPublishedEvent | AineistoChangedEvent | ResetKayttooikeudetEvent;

export class ProjektiAdaptationResult {
  private dbProjekti: DBProjekti;
  private events: ProjektiEvent[] = [];

  constructor(dbProjekti: DBProjekti) {
    this.dbProjekti = dbProjekti;
  }

  setProjekti(dbProjekti: DBProjekti): void {
    this.dbProjekti = dbProjekti;
  }

  private pushEvent(event: ProjektiEvent): void {
    if (!this.events.find((e) => e.eventType == event.eventType)) {
      this.events.push(event);
    }
  }

  get projekti(): DBProjekti {
    return this.dbProjekti;
  }

  async onEvent(eventType: ProjektiEventType, eventHandler: (event: ProjektiEvent, oid: string) => Promise<void>): Promise<void> {
    for (const event of this.events) {
      if (event.eventType == eventType) {
        await eventHandler(event, this.projekti.oid);
      }
    }
  }

  vuorovaikutusPublished(vuorovaikutusNumero: number): void {
    const newEvent: VuorovaikutusPublishedEvent = {
      eventType: ProjektiEventType.VUOROVAIKUTUS_PUBLISHED,
      vuorovaikutusNumero,
    };
    this.pushEvent(newEvent);
  }

  aineistoChanged(): void {
    const newEvent: AineistoChangedEvent = {
      eventType: ProjektiEventType.AINEISTO_CHANGED,
    };
    this.pushEvent(newEvent);
  }

  resetKayttooikeudetAndSynchronizeVelho(): void {
    const newEvent: ResetKayttooikeudetEvent = {
      eventType: ProjektiEventType.RESET_KAYTTOOIKEUDET,
    };
    this.pushEvent(newEvent);
  }
}
