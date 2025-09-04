export function getMuistuttajaTableName() {
  if (process.env.TABLE_PROJEKTI_MUISTUTTAJA) {
    return process.env.TABLE_PROJEKTI_MUISTUTTAJA;
  }
  throw new Error("Ympäristömuuttujaa TABLE_PROJEKTI_MUISTUTTAJA ei löydy");
}

export function getKiinteistonomistajaTableName() {
  if (process.env.TABLE_KIINTEISTONOMISTAJA) {
    return process.env.TABLE_KIINTEISTONOMISTAJA;
  }
  throw new Error("Ympäristömuuttujaa TABLE_KIINTEISTONOMISTAJA ei löydy");
}

export function getTiedoteTableName() {
  if (process.env.TABLE_TIEDOTE) {
    return process.env.TABLE_TIEDOTE;
  }
  throw new Error("Ympäristömuuttujaa TABLE_TIEDOTE ei löydy");
}
