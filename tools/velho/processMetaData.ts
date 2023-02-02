import * as fs from "fs";
import { processAlueData } from "./processAlueData";

const metaDataJSON = JSON.parse(fs.readFileSync(__dirname + "/build/metadata.json").toString("utf8"));

const redactedMetaData = {
  info: {
    "x-velho-nimikkeistot": [
      "projekti/tila",
      "projekti/vaihe",
      "projekti/organisaatio",
      "projekti/arvioitu-toteutusajankohta",
      "aineisto/dokumenttityyppi",
    ].reduce((catalog: any, key) => {
      catalog[key] = (metaDataJSON.info["x-velho-nimikkeistot"] as any)[key];
      return catalog;
    }, {}),
  },
};
fs.writeFileSync(process.argv[2], JSON.stringify(redactedMetaData));

function extractVelhoValuesIntoMap(field: string) {
  const values: any = {};
  const definition: any = (metaDataJSON.info["x-velho-nimikkeistot"] as any)[field];
  const keyTitleMap = definition.nimikkeistoversiot[definition["uusin-nimikkeistoversio"]];
  Object.keys(keyTitleMap).forEach((key) => {
    return (values[key] = { otsikko: keyTitleMap[key].otsikko, kategoria: keyTitleMap[key].kategoria });
  });
  return values;
}

function parseSuunnitelmanTilat() {
  const velhoSuunnitelmanTilat = extractVelhoValuesIntoMap("projekti/suunnitelman-tila");
  const suunnitelmanTilat = Object.keys(velhoSuunnitelmanTilat).reduce((tilat: Record<string, string>, tila) => {
    tilat[tila] = velhoSuunnitelmanTilat[tila].otsikko;
    return tilat;
  }, {});
  fs.writeFileSync(
    __dirname + "/../../common/generated/kasittelynTila.ts",
    `export const suunnitelmanTilat = ${JSON.stringify(suunnitelmanTilat, null, 2)}`
  );
}

parseSuunnitelmanTilat();
processAlueData();
