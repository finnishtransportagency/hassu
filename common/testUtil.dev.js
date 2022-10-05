// Esimerkkejä urlien luomisesta:
// - ProjektiTestCommand.oid(oid).nahtavillaolomenneisyyteen()
// - ProjektiTestCommand.oid(oid).hyvaksymispaatosmenneisyyteen()

export const TestAction = {
  NAHTAVILLAOLO_MENNEISYYTEEN: "nahtavillaolomenneisyyteen",
  HYVAKSYMISPAATOS_MENNEISYYTEEN: "hyvaksymispaatosmenneisyyteen",
  HYVAKSYMISPAATOS_VUOSI_MENNEISYYTEEN: "hyvaksymispaatosvuosimenneisyyteen",
  RESET_SUUNNITTELU: "reset_suunnittelu",
  RESET_VUOROVAIKUTUKSET: "reset_vuorovaikutukset",
  RESET_NAHTAVILLAOLO: "reset_nahtavillaolo",
  RESET_HYVAKSYMISVAIHE: "reset_hyvaksymisvaihe",
};

const QUERYPARAM_ACTION = "action";

export class ProjektiTestCommand {
  _oid;

  constructor(oid) {
    this._oid = oid;
  }

  static oid(oid) {
    return new ProjektiTestCommand(oid);
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

  createActionUrl(action) {
    let url = `/api/test/${this._oid}`;
    let params = new URLSearchParams();
    params.set(QUERYPARAM_ACTION, action);
    return url + "?" + params.toString();
  }
}

export class ProjektiTestCommandExecutor {
  _oid;
  _action;

  constructor(query) {
    this._oid = query.oid;
    if (!this._oid) {
      throw Error("oid puuttuu");
    }
    this._action = query[QUERYPARAM_ACTION];
    if (!this._action) {
      throw Error("action puuttuu");
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

  onResetNahtavillaolo(callback) {
    if (this._action === TestAction.RESET_NAHTAVILLAOLO) {
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
}
