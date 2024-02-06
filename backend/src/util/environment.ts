export function getMuistuttajaTableName() {
  if (process.env.TABLE_MUISTUTTAJA) {
    return process.env.TABLE_MUISTUTTAJA;
  }
  throw new Error("Ympäristömuuttujaa TABLE_MUISTUTTAJA ei löydy");
}

export function getOmistajaTableName() {
  if (process.env.TABLE_OMISTAJA) {
    return process.env.TABLE_OMISTAJA;
  }
  throw new Error("Ympäristömuuttujaa TABLE_OMISTAJA ei löydy");
}
