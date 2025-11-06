import sykeKunnat from "./build/kunnat.json";
import sykeMaakunnat from "./build/maakunnat.json";
import sykeElyt from "./build/ely.json";
import * as fs from "fs";
import { Kieli } from "../../common/graphql/apiModel";
import { Ely, Kunta, Maakunta } from "../../common/kuntametadata";

const metaDataJSON = JSON.parse(fs.readFileSync(__dirname + "/build/metadata.json").toString("utf8"));

const velhometadata = {
  info: {
    "x-velho-nimikkeistot": ["alueet/kunta", "alueet/maakunta", "alueet/ely"].reduce((catalog: any, key) => {
      catalog[key] = (metaDataJSON.info["x-velho-nimikkeistot"] as any)[key];
      return catalog;
    }, {}),
  },
};

type VelhoKunta = {
  maakunta: string; //"maakunta/maakunta17",
  koodi: string; //"563",
  otsikko: string; // "Oulainen",
  "liikennevastuu-ely": string; //"ely/ely13",
  ely: string; //"ely/ely13",
  elinvoimakeskus: string; //"elinvoimakeskus/elinvoimakeskus09",
  avi: string; // "avi/avi5"
  lakkautettu?: string;
  Nro: string;
};

type VelhoMaakunta = {
  maakunta: string; //"maakunta/maakunta17",
  koodi: string; //"563",
  otsikko: string;
  lakkautettu?: string;
};

type VelhoEly = {
  koodi: string;
  otsikko: string;
};

function parseKunnat(): Record<number, Kunta> {
  const kuntaMap: Record<number, Kunta> = {};

  const velhoKunnat = extractLatestVersionOfVelhoMetadata(velhometadata, "alueet/kunta") as Record<string, VelhoKunta>;
  for (const velhoKuntaId in velhoKunnat) {
    const velhoKunta = velhoKunnat[velhoKuntaId];
    if (!velhoKunta.lakkautettu) {
      const kuntaId = Number.parseInt(velhoKunta.koodi);
      let velhoKuntanimi = velhoKunta.otsikko;
      if (velhoKuntanimi == "Maarianhamina - Mariehamn") {
        velhoKuntanimi = "Maarianhamina";
      }
      let nimi = { SUOMI: velhoKuntanimi };
      let kunta: Kunta = {
        id: kuntaId,
        nimi,
        ely: velhoKunta.ely,
        elinvoimakeskus: velhoKunta.elinvoimakeskus,
        liikennevastuuEly: velhoKunta["liikennevastuu-ely"],
        maakunta: velhoKunta.maakunta,
      };
      if (velhoKunta.lakkautettu) {
        kunta.lakkautettu = true;
      } else {
        let sykeKunta = sykeKunnat.value.find((sykeKunta) => sykeKunta.Kunta_Id == kuntaId);
        if (sykeKunta) {
          kunta.nimi.RUOTSI = sykeKunta.NimiRuo;
        }
      }
      kuntaMap[kuntaId] = kunta;
    }
  }
  return kuntaMap;
}

function parseMaakunnat(): Record<string, Maakunta> {
  const maakuntaMap: Record<string, Maakunta> = {};
  const velhoMaakunnat = extractLatestVersionOfVelhoMetadata(velhometadata, "alueet/maakunta") as Record<string, VelhoMaakunta>;
  for (const velhoMaakuntaId in velhoMaakunnat) {
    const velhoMaakunta = velhoMaakunnat[velhoMaakuntaId];
    const maakuntaId = Number.parseInt(velhoMaakunta.koodi);
    const maakunta: Maakunta = {
      id: velhoMaakuntaId,
      koodi: velhoMaakunta.koodi,
      nimi: { [Kieli.SUOMI]: velhoMaakunta.otsikko },
    };
    if (velhoMaakunta.lakkautettu) {
      maakunta.lakkautettu = true;
    } else {
      let sykeMaakunta = sykeMaakunnat.value.find((sykeMaakunta) => sykeMaakunta.Maakunta_Id == maakuntaId);
      if (sykeMaakunta) {
        maakunta.nimi.RUOTSI = sykeMaakunta.NimiRuo;
        maakunta.liittoNimi = sykeMaakunta.LiittoNimi;
      }
    }
    maakuntaMap[maakuntaId] = maakunta;
  }
  return maakuntaMap;
}

function parseVelhoElyt() {
  const velhoElyt = extractLatestVersionOfVelhoMetadata(velhometadata, "alueet/ely") as Record<string, VelhoEly>;
  return Object.keys(velhoElyt).reduce((result: Record<string, Ely>, velhoElyId) => {
    const velhoEly = velhoElyt[velhoElyId];
    const nro = velhoEly.koodi;

    let sykeEly = sykeElyt.value.find((sykeEly) => sykeEly.Nro == nro);
    if (!sykeEly) {
      throw new Error("Syke-elyä ei löydy numerolla " + nro);
    }

    result[velhoElyId] = { nro, lyhenne: sykeEly.Lyhenne, sykeElyId: sykeEly.Ely_Id };
    return result;
  }, {} as Record<string, Ely>);
}

function extractLatestVersionOfVelhoMetadata(velhoJSON: typeof velhometadata, field: string): unknown {
  const definition: any = (velhoJSON.info["x-velho-nimikkeistot"] as any)[field];
  return definition.nimikkeistoversiot[definition["uusin-nimikkeistoversio"]];
}

export function processAlueData() {
  const kunnat = parseKunnat();
  const maakunnat = parseMaakunnat();
  const elyt = parseVelhoElyt();

  fs.writeFileSync(
    __dirname + "/../../common/generated/aluedata.ts",
    `import { AlueData } from "../kuntametadata";
export const alueData : AlueData = ${JSON.stringify({ kunnat, maakunnat, elyt }, null, 2)}`
  );
  console.log("Valmis.");
}
