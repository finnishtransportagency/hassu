import inquirer from "inquirer";

/*
  Työkalu AWS_PROFILE:n ja ENVIRONMENT-muuttujan asettamiseen.
  Käyttö: npm run switchenv
  Syöte: DEVELOPER-muuttuja .env-tiedostossa
  Tulos: .env.current-tiedosto, joka sisältää AWS_PROFILE:n ja ENVIRONMENT-muuttujan

  Huom: direnv täytyy olla riittävän uusi, jotta .envrc-tiedostossa voi käyttää dotenv_if_exists -funktiota.
 */
import { parse } from "dotenv";
import fs from "fs";
import { Config, EnvName } from "../lib/config";

// Lue .env-tiedosto
const env = parse(fs.readFileSync(".env"));

if (!env.DEVELOPER) {
  throw new Error("Aseta DEVELOPER=<ympäristösi nimi> .env-tiedostoon");
}

if (env.AWS_PROFILE || env.ENVIRONMENT) {
  throw new Error("Poista AWS_PROFILE ja ENVIRONMENT .env-tiedostosta");
}
const envNames = Object.keys(EnvName)
  .filter((key) => !["localstack", "feature"].includes(key))
  .sort((a, b) => {
    if (a === "developer" || a === "developer") {
      return -1;
    }
    return a.localeCompare(b);
  });

// Kysy käyttäjältä, mihin ympäristöön halutaan vaihtaa
inquirer
  .prompt([
    {
      type: "list",
      name: "ENVIRONMENT",
      message: "Mihin ympäristöön haluat vaihtaa?",
      choices: envNames,
    },
  ])
  .then((answer) => {
    const envConfig = Config.getEnvConfig(answer.ENVIRONMENT);

    // Kirjoita .env.current-tiedostoon
    let environmentName;
    if (answer.ENVIRONMENT === "developer") {
      environmentName = env.DEVELOPER;
    } else {
      environmentName = answer.ENVIRONMENT;
    }

    let awsProfile;
    if (envConfig.isDevAccount) {
      awsProfile = "hassudev";
    } else {
      awsProfile = "hassuprod";
    }

    fs.writeFileSync(".env.current", [`ENVIRONMENT=${environmentName}`, `AWS_PROFILE=${awsProfile}`].join("\n"));
  });
