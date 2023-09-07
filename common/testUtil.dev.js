// Esimerkkejä urlien luomisesta:
// - ProjektiTestCommand.oid(oid).nahtavillaolomenneisyyteen()
// - ProjektiTestCommand.oid(oid).hyvaksymispaatosmenneisyyteen()

export const TestAction = {
  AJANSIIRTO: "ajansiirto",
  VUOROVAIKUTUSKIERROS_MENNEISYYTEEN: "vuorovaikutuskierrosmenneisyyteen",
  NAHTAVILLAOLO_MENNEISYYTEEN: "nahtavillaolomenneisyyteen",
  HYVAKSYMISPAATOS_MENNEISYYTEEN: "hyvaksymispaatosmenneisyyteen",
  HYVAKSYMISPAATOS_VUOSI_MENNEISYYTEEN: "hyvaksymispaatosvuosimenneisyyteen",
  RESET_ALOITUSKUULUTUS: "reset_aloituskuulutus",
  RESET_SUUNNITTELU: "reset_suunnittelu",
  RESET_VUOROVAIKUTUKSET: "reset_vuorovaikutukset",
  RESET_NAHTAVILLAOLO: "reset_nahtavillaolo",
  RESET_HYVAKSYMISVAIHE: "reset_hyvaksymisvaihe",
  MIGROI: "migroi",
  RESET_JATKOPAATOS1VAIHE: "reset_jatkopaatos1vaihe",
  JATKOPAATOS1_MENNEISYYTEEN: "jatkopaatos1menneisyyteen",
  JATKOPAATOS1_VUOSI_MENNEISYYTEEN: "jatkopaatos1vuosimenneisyyteen",
  KAYNNISTA_ASIANHALLINTA_SYNKRONOINTI: "kaynnistaasianhallintasynkronointi",
};

const QUERYPARAM_ACTION = "action";
const QUERYPARAM_TARGETSTATUS = "targetStatus";
const QUERYPARAM_DAYS = "days";

export class ProjektiTestCommand {
  _oid;

  constructor(oid) {
    this._oid = oid;
  }

  static oid(oid) {
    return new ProjektiTestCommand(oid);
  }

  ajansiirto(days) {
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

  migroi(targetStatus) {
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

  kaynnistaAsianhallintasynkronointi() {
    return this.createActionUrl(TestAction.KAYNNISTA_ASIANHALLINTA_SYNKRONOINTI);
  }

  createActionUrl(action, queryParams) {
    let url = `/api/test/${this._oid}`;
    let params = new URLSearchParams();
    params.set(QUERYPARAM_ACTION, action);
    if (queryParams) {
      for (const key in queryParams) {
        params.set(key, queryParams[key]);
      }
    }
    return url + "?" + params.toString();
  }
}

export class ProjektiTestCommandExecutor {
  _oid;
  _action;
  _targetStatus;
  _days;

  constructor(query) {
    this._oid = query.oid;
    if (!this._oid) {
      throw Error("oid puuttuu");
    }
    this._action = query[QUERYPARAM_ACTION];
    if (!this._action) {
      throw Error("action puuttuu");
    }
    this._targetStatus = query[QUERYPARAM_TARGETSTATUS];
    this._days = query[QUERYPARAM_DAYS];
  }

  getOid() {
    return this._oid;
  }

  onVuorovaikutusKierrosMenneisyyteen(callback) {
    if (this._action === TestAction.VUOROVAIKUTUSKIERROS_MENNEISYYTEEN) {
      return callback(this._oid);
    }
  }

  onNahtavillaoloMenneisyyteen(callback) {
    if (this._action === TestAction.NAHTAVILLAOLO_MENNEISYYTEEN) {
      return callback(this._oid);
    }
  }

  onHyvaksymispaatosMenneisyyteen(callback) {
    if (this._action === TestAction.HYVAKSYMISPAATOS_MENNEISYYTEEN) {
      return callback(this._oid);
    }
  }

  onHyvaksymispaatosVuosiMenneisyyteen(callback) {
    if (this._action === TestAction.HYVAKSYMISPAATOS_VUOSI_MENNEISYYTEEN) {
      return callback(this._oid);
    }
  }

  onAjansiirto(callback) {
    if (this._action === TestAction.AJANSIIRTO) {
      return callback(this._oid, this._days);
    }
  }

  onResetNahtavillaolo(callback) {
    if (this._action === TestAction.RESET_NAHTAVILLAOLO) {
      return callback(this._oid);
    }
  }

  onResetAloituskuulutus(callback) {
    if (this._action === TestAction.RESET_ALOITUSKUULUTUS) {
      return callback(this._oid);
    }
  }

  onResetSuunnittelu(callback) {
    if (this._action === TestAction.RESET_SUUNNITTELU) {
      return callback(this._oid);
    }
  }

  onResetVuorovaikutukset(callback) {
    if (this._action === TestAction.RESET_VUOROVAIKUTUKSET) {
      return callback(this._oid);
    }
  }

  onResetHyvaksymisvaihe(callback) {
    if (this._action === TestAction.RESET_HYVAKSYMISVAIHE) {
      return callback(this._oid);
    }
  }

  onMigraatio(callback) {
    if (this._action === TestAction.MIGROI) {
      return callback(this._oid, this._targetStatus, this._hyvaksymispaatosPaivamaara, this._hyvaksymispaatosAsianumero);
    }
  }

  onResetJatkopaatos1vaihe(callback) {
    if (this._action === TestAction.RESET_JATKOPAATOS1VAIHE) {
      return callback(this._oid);
    }
  }

  onJatkopaatos1Menneisyyteen(callback) {
    if (this._action === TestAction.JATKOPAATOS1_MENNEISYYTEEN) {
      return callback(this._oid);
    }
  }

  onJatkopaatos1VuosiMenneisyyteen(callback) {
    if (this._action === TestAction.JATKOPAATOS1_VUOSI_MENNEISYYTEEN) {
      return callback(this._oid);
    }
  }

  onKaynnistaAsianhallintaSynkronointi(callback) {
    if (this._action === TestAction.KAYNNISTA_ASIANHALLINTA_SYNKRONOINTI) {
      return callback(this._oid);
    }
  }
}
