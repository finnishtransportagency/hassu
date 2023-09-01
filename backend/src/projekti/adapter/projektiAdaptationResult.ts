import { DBProjekti } from "../../database/model";

export enum ProjektiEventType {
  VUOROVAIKUTUS_PUBLISHED = "VUOROVAIKUTUS_PUBLISHED",
  AINEISTO_CHANGED = "AINEISTO_CHANGED",
  LOGO_FILES_CHANGED = "LOGO_FILES_CHANGED",
  RESET_KAYTTOOIKEUDET = "RESET_KAYTTOOIKEUDET",
  SAVE_PROJEKTI_TO_VELHO = "SAVE_PROJEKTI_TO_VELHO",
}

export type VuorovaikutusPublishedEvent = {
  eventType: ProjektiEventType.VUOROVAIKUTUS_PUBLISHED;
  vuorovaikutusNumero: number;
};

export type AineistoChangedEvent = { eventType: ProjektiEventType.AINEISTO_CHANGED };
export type logoFilesChangedEvent = { eventType: ProjektiEventType.LOGO_FILES_CHANGED };
export type ResetKayttooikeudetEvent = { eventType: ProjektiEventType.RESET_KAYTTOOIKEUDET };
export type SaveProjektiToVelhoEvent = { eventType: ProjektiEventType.SAVE_PROJEKTI_TO_VELHO };

export type ProjektiEvent =
  | VuorovaikutusPublishedEvent
  | AineistoChangedEvent
  | ResetKayttooikeudetEvent
  | SaveProjektiToVelhoEvent
  | logoFilesChangedEvent;

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

  logoFilesChanged(): void {
    const newEvent: logoFilesChangedEvent = {
      eventType: ProjektiEventType.LOGO_FILES_CHANGED,
    };
    this.pushEvent(newEvent);
  }

  resetKayttooikeudetAndSynchronizeVelho(): void {
    const newEvent: ResetKayttooikeudetEvent = {
      eventType: ProjektiEventType.RESET_KAYTTOOIKEUDET,
    };
    this.pushEvent(newEvent);
  }

  saveProjektiToVelho(): void {
    const newEvent: SaveProjektiToVelhoEvent = {
      eventType: ProjektiEventType.SAVE_PROJEKTI_TO_VELHO,
    };
    this.pushEvent(newEvent);
  }
}
