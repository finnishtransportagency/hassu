// Esimerkkejä urlien luomisesta:
// - ProjektiTestCommand.oid(oid).nahtavillaolomenneisyyteen()
// - ProjektiTestCommand.oid(oid).hyvaksymispaatosmenneisyyteen()

import { ParsedUrlQuery } from "querystring";
import assert from "assert";

export enum TestAction {
  AJANSIIRTO = "ajansiirto",
  VUOROVAIKUTUSKIERROS_MENNEISYYTEEN = "vuorovaikutuskierrosmenneisyyteen",
  NAHTAVILLAOLO_MENNEISYYTEEN = "nahtavillaolomenneisyyteen",
  HYVAKSYMISPAATOS_MENNEISYYTEEN = "hyvaksymispaatosmenneisyyteen",
  HYVAKSYMISPAATOS_VUOSI_MENNEISYYTEEN = "hyvaksymispaatosvuosimenneisyyteen",
  RESET_ALOITUSKUULUTUS = "reset_aloituskuulutus",
  RESET_SUUNNITTELU = "reset_suunnittelu",
  RESET_VUOROVAIKUTUKSET = "reset_vuorovaikutukset",
  RESET_NAHTAVILLAOLO = "reset_nahtavillaolo",
  RESET_HYVAKSYMISVAIHE = "reset_hyvaksymisvaihe",
  MIGROI = "migroi",
  RESET_JATKOPAATOS1VAIHE = "reset_jatkopaatos1vaihe",
  JATKOPAATOS1_MENNEISYYTEEN = "jatkopaatos1menneisyyteen",
  JATKOPAATOS1_VUOSI_MENNEISYYTEEN = "jatkopaatos1vuosimenneisyyteen",
  JATKOPAATOS2_MENNEISYYTEEN = "jatkopaatos2menneisyyteen",
  JATKOPAATOS2_VUOSI_MENNEISYYTEEN = "jatkopaatos2vuosimenneisyyteen",
  KAYNNISTA_ASIANHALLINTA_SYNKRONOINTI = "kaynnistaasianhallintasynkronointi",
}

const QUERYPARAM_ACTION = "action";
const QUERYPARAM_TARGETSTATUS = "targetStatus";
const QUERYPARAM_DAYS = "days";

export class ProjektiTestCommand {
  _oid;

  constructor(oid: string) {
    this._oid = oid;
  }

  static oid(oid: string) {
    return new ProjektiTestCommand(oid);
  }

  ajansiirto(days: string) {
    return this.createActionUrl(TestAction.AJANSIIRTO, { [QUERYPARAM_DAYS]: days });
  }

  vuorovaikutusKierrosMenneisyyteen() {
    return this.createActionUrl(TestAction.VUOROVAIKUTUSKIERROS_MENNEISYYTEEN);
  }

  nahtavillaoloMenneisyyteen() {
    return this.createActionUrl(TestAction.NAHTAVILLAOLO_MENNEISYYTEEN);
  }

  hyvaksymispaatosMenneisyyteen() {
    return this.createActionUrl(TestAction.HYVAKSYMISPAATOS_MENNEISYYTEEN);
  }

  hyvaksymispaatosVuosiMenneisyyteen() {
    return this.createActionUrl(TestAction.HYVAKSYMISPAATOS_VUOSI_MENNEISYYTEEN);
  }

  resetAloituskuulutus() {
    return this.createActionUrl(TestAction.RESET_ALOITUSKUULUTUS);
  }

  resetSuunnitteluVaihe() {
    return this.createActionUrl(TestAction.RESET_SUUNNITTELU);
  }

  resetVuorovaikutukset() {
    return this.createActionUrl(TestAction.RESET_VUOROVAIKUTUKSET);
  }

  resetNahtavillaolo() {
    return this.createActionUrl(TestAction.RESET_NAHTAVILLAOLO);
  }

  resetHyvaksymisvaihe() {
    return this.createActionUrl(TestAction.RESET_HYVAKSYMISVAIHE);
  }

  migroi(targetStatus: string) {
    return this.createActionUrl(TestAction.MIGROI, {
      [QUERYPARAM_TARGETSTATUS]: targetStatus,
    });
  }

  resetJatkopaatos1vaihe() {
    return this.createActionUrl(TestAction.RESET_JATKOPAATOS1VAIHE);
  }

  jatkopaatos1Menneisyyteen() {
    return this.createActionUrl(TestAction.JATKOPAATOS1_MENNEISYYTEEN);
  }

  jatkopaatos1VuosiMenneisyyteen() {
    return this.createActionUrl(TestAction.JATKOPAATOS1_VUOSI_MENNEISYYTEEN);
  }

  jatkopaatos2Menneisyyteen() {
    return this.createActionUrl(TestAction.JATKOPAATOS2_MENNEISYYTEEN);
  }

  jatkopaatos2VuosiMenneisyyteen() {
    return this.createActionUrl(TestAction.JATKOPAATOS2_VUOSI_MENNEISYYTEEN);
  }

  kaynnistaAsianhallintasynkronointi() {
    return this.createActionUrl(TestAction.KAYNNISTA_ASIANHALLINTA_SYNKRONOINTI);
  }

  createActionUrl(action: TestAction, queryParams?: Record<string, string | undefined>) {
    const url = `/yllapito/projekti/${this._oid}/testikomento`;
    const params = new URLSearchParams();
    params.set(QUERYPARAM_ACTION, action);
    if (queryParams) {
      for (const key in queryParams) {
        const value = queryParams[key];
        if (value) {
          params.set(key, value);
        }
      }
    }
    return url + "?" + params.toString();
  }
}

export class ProjektiTestCommandExecutor {
  _oid: string;
  _action: string | undefined;
  _targetStatus: string | undefined;
  _days: string | undefined;

  constructor(query: ParsedUrlQuery) {
    const oid = firstOrOnly(query.oid);
    if (!oid) {
      throw Error("oid puuttuu");
    }
    this._oid = oid;
    this._action = firstOrOnly(query[QUERYPARAM_ACTION]);
    if (!this._action) {
      throw Error("action puuttuu");
    }
    this._targetStatus = firstOrOnly(query[QUERYPARAM_TARGETSTATUS]);
    this._days = firstOrOnly(query[QUERYPARAM_DAYS]);
  }

  getOid() {
    return this._oid;
  }

  async onVuorovaikutusKierrosMenneisyyteen(callback: (oid: string) => Promise<void>) {
    if (this._action === TestAction.VUOROVAIKUTUSKIERROS_MENNEISYYTEEN) {
      return callback(this._oid);
    }
  }

  async onNahtavillaoloMenneisyyteen(callback: (oid: string) => Promise<void>) {
    if (this._action === TestAction.NAHTAVILLAOLO_MENNEISYYTEEN) {
      return callback(this._oid);
    }
  }

  async onHyvaksymispaatosMenneisyyteen(callback: (oid: string) => Promise<void>) {
    if (this._action === TestAction.HYVAKSYMISPAATOS_MENNEISYYTEEN) {
      return callback(this._oid);
    }
  }

  async onHyvaksymispaatosVuosiMenneisyyteen(callback: (oid: string) => Promise<void>) {
    if (this._action === TestAction.HYVAKSYMISPAATOS_VUOSI_MENNEISYYTEEN) {
      return callback(this._oid);
    }
  }

  async onAjansiirto(callback: (oid: string, days: string) => Promise<void>) {
    if (this._action === TestAction.AJANSIIRTO) {
      assert(this._days, "ajansiirron määrä puuttuu");
      return callback(this._oid, this._days);
    }
  }

  async onResetNahtavillaolo(callback: (oid: string) => Promise<void>) {
    if (this._action === TestAction.RESET_NAHTAVILLAOLO) {
      return callback(this._oid);
    }
  }

  async onResetAloituskuulutus(callback: (oid: string) => Promise<void>) {
    if (this._action === TestAction.RESET_ALOITUSKUULUTUS) {
      return callback(this._oid);
    }
  }

  async onResetSuunnittelu(callback: (oid: string) => Promise<void>) {
    if (this._action === TestAction.RESET_SUUNNITTELU) {
      return callback(this._oid);
    }
  }

  async onResetVuorovaikutukset(callback: (oid: string) => Promise<void>) {
    if (this._action === TestAction.RESET_VUOROVAIKUTUKSET) {
      return callback(this._oid);
    }
  }

  async onResetHyvaksymisvaihe(callback: (oid: string) => Promise<void>) {
    if (this._action === TestAction.RESET_HYVAKSYMISVAIHE) {
      return callback(this._oid);
    }
  }

  async onMigraatio(callback: (oid: string, targetStatus: string) => Promise<void>) {
    if (this._action === TestAction.MIGROI) {
      assert(this._targetStatus, "targetStatus puuttuu");
      await callback(this._oid, this._targetStatus);
      return this._action;
    }
  }

  async onResetJatkopaatos1vaihe(callback: (oid: string) => Promise<void>) {
    if (this._action === TestAction.RESET_JATKOPAATOS1VAIHE) {
      return callback(this._oid);
    }
  }

  async onJatkopaatos1Menneisyyteen(callback: (oid: string) => Promise<void>) {
    if (this._action === TestAction.JATKOPAATOS1_MENNEISYYTEEN) {
      return callback(this._oid);
    }
  }

  async onJatkopaatos1VuosiMenneisyyteen(callback: (oid: string) => Promise<void>) {
    if (this._action === TestAction.JATKOPAATOS1_VUOSI_MENNEISYYTEEN) {
      return callback(this._oid);
    }
  }

  async onJatkopaatos2Menneisyyteen(callback: (oid: string) => Promise<void>) {
    if (this._action === TestAction.JATKOPAATOS2_MENNEISYYTEEN) {
      return callback(this._oid);
    }
  }

  async onJatkopaatos2VuosiMenneisyyteen(callback: (oid: string) => Promise<void>) {
    if (this._action === TestAction.JATKOPAATOS2_VUOSI_MENNEISYYTEEN) {
      return callback(this._oid);
    }
  }

  async onKaynnistaAsianhallintaSynkronointi(callback: (oid: string) => Promise<void>) {
    if (this._action === TestAction.KAYNNISTA_ASIANHALLINTA_SYNKRONOINTI) {
      return callback(this._oid);
    }
  }
}

// function that accepts string[] or string and returns the string or first element of the array
function firstOrOnly(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
