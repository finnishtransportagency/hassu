import * as fs from "fs";

const metaDataJSON = JSON.parse(fs.readFileSync(__dirname + "/build/metadata.json").toString("UTF-8"));

const redactedMetaData = {
  info: {
    "x-velho-nimikkeistot": [
      "projekti/tila",
      "projekti/vaihe",
      "projekti/organisaatio",
      "projekti/arvioitu-toteutusajankohta",
    ].reduce((catalog: any, key) => {
      catalog[key] = (metaDataJSON.info["x-velho-nimikkeistot"] as any)[key];
      return catalog;
    }, {}),
  },
};
fs.writeFileSync(process.argv[2], JSON.stringify(redactedMetaData));
