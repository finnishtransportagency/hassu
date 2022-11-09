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
  all[ely.Lyhenne] = { id: ely.Ely_Id, nimi: ely.Nimi };
  return all;
}, {});
fs.writeFileSync(process.argv[4], JSON.stringify(elyt));
