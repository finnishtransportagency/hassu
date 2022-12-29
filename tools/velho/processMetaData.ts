import * as fs from "fs";

const metaDataJSON = JSON.parse(fs.readFileSync(__dirname + "/build/metadata.json").toString("UTF-8"));

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

const redactedMetaDataKunnatMaakunnat = {
  info: {
    "x-velho-nimikkeistot": ["alueet/kunta", "alueet/maakunta"].reduce((catalog: any, key) => {
      catalog[key] = (metaDataJSON.info["x-velho-nimikkeistot"] as any)[key];
      return catalog;
    }, {}),
  },
};
fs.writeFileSync(process.argv[3], JSON.stringify(redactedMetaDataKunnatMaakunnat));

const elyData = JSON.parse(fs.readFileSync(__dirname + "/build/ely.json").toString()).value;
const elyt = elyData.reduce((all: Record<string, unknown>, ely: any) => {
  all[ely.Lyhenne] = { id: ely.Ely_Id, nimi: ely.Nimi, lelyId: ely.LiikenneEly_Id };
  return all;
}, {});
fs.writeFileSync(process.argv[4], JSON.stringify(elyt));

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
