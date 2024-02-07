export function getMuistuttajaTableName() {
  if (process.env.TABLE_MUISTUTTAJA2) {
    return process.env.TABLE_MUISTUTTAJA2;
  }
  throw new Error("Ympäristömuuttujaa TABLE_MUISTUTTAJA2 ei löydy");
}

export function getKiinteistonomistajaTableName() {
  if (process.env.TABLE_KIINTEISTONOMISTAJA) {
    return process.env.TABLE_KIINTEISTONOMISTAJA;
  }
  throw new Error("Ympäristömuuttujaa TABLE_KIINTEISTONOMISTAJA ei löydy");
}
