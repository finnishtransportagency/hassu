import { generateExcelByOid } from "../src/mml/tiedotettavatExcel";
import fs from "fs";
import { identifyMockUser } from "../src/user/userService";
import { Vaihe } from "hassu-common/graphql/apiModel";

let suomifi = true;
if (process.argv.includes("--suomifi")) {
  const idx = process.argv.findIndex((a) => a === "--suomifi");
  if (idx !== -1) {
    suomifi = process.argv[idx + 1] === "true";
  }
}
let vaihe = undefined;
if (process.argv.includes("--maanomistajat")) {
  const idx = process.argv.findIndex((a) => a === "--maanomistajat");
  if (idx !== -1) {
    vaihe = process.argv[idx + 1] === "NAHTAVILLAOLO" ? Vaihe.NAHTAVILLAOLO : Vaihe.HYVAKSYMISPAATOS;
  }
}
const kiinteisto = process.argv.includes("--kiinteisto");
console.log("Suomi.fi: " + suomifi);
console.log("Kiinteisto: " + kiinteisto);
console.log("Vaihe: " + vaihe);
identifyMockUser({ roolit: ["hassu_admin"], etunimi: "Test", sukunimi: "Test", uid: "testuid", __typename: "NykyinenKayttaja" });
generateExcelByOid(process.argv[2], suomifi, kiinteisto, vaihe, "2024-02-21")
  .then((excel) => {
    console.log("Tiedostonimi: " + excel.nimi);
    fs.writeFileSync(excel.nimi, Buffer.from(excel.sisalto, "base64"));
  })
  .catch((e) => console.error(e));
