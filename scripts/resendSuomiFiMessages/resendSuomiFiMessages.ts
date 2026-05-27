#!/usr/bin/env ts-node
// Contains code generated or recommended by Amazon Q
// HUOM: Aja tämä skripti komennolla:
// npx ts-node scripts/resendSuomiFiMessages/resendSuomiFiMessages.ts --env dev|prod [--dry-run]

// Hiljennä punycode-varoitus (tulee riippuvuuksista)
process.removeAllListeners("warning");
// Pakota käyttämään oikeaa AWS:ää
process.env.USE_SSM = "true";
// Näytä logit selkeästi terminaalissa
process.env.USE_PINO_PRETTY = "true";
// .env asettaa LOG_LEVEL=error, ylikirjoitetaan jotta logit näkyvät
process.env.LOG_LEVEL = "info";

import { getSQS } from "../../backend/src/aws/clients/getSQS";
import { SendMessageBatchRequestEntry } from "@aws-sdk/client-sqs";
import { chunkArray } from "../../backend/src/database/chunkArray";
import { auditLog, log } from "../../backend/src/logger";
import { SuomiFiSanoma } from "../../backend/src/suomifi/suomifiHandler";
import { FailedMessage, loadFailedMessagesFromFile } from "./parseSuomifiSanomaData";
import * as path from "path";

const VALID_ENVS = ["dev", "prod"] as const;
type Env = (typeof VALID_ENVS)[number];

function getEnvFromArgs(): Env {
  const envArg = process.argv.find((arg) => arg.startsWith("--env="))?.split("=")[1] || process.argv[process.argv.indexOf("--env") + 1];
  if (!envArg || !VALID_ENVS.includes(envArg as Env)) {
    console.error(`Käyttö: ts-node resendSuomiFiMessages.ts --env dev|prod [--dry-run]`);
    process.exit(1);
  }
  return envArg as Env;
}

async function getQueueUrl(env: Env): Promise<string> {
  const queueName = `suomifi-queue-${env}`;
  const response = await getSQS().getQueueUrl({ QueueName: queueName });
  if (!response.QueueUrl) throw new Error(`Jonoa ${queueName} ei löytynyt. Tarkista AWS-kirjautuminen.`);
  return response.QueueUrl;
}

const env = getEnvFromArgs();
const dryRun = process.argv.includes("--dry-run");

const OMISTAJA_PREFIX = "omistaja-";
const MUISTUTTAJA_PREFIX = "muistuttaja-";

// Lataa lähetettävät viestit JSON-tiedostosta
const logDataPath = path.join(__dirname, "failed-suomifi-messages.json");
const FAILED_MESSAGES: FailedMessage[] = loadFailedMessagesFromFile(logDataPath);

async function resendFailedMessages() {
  let QUEUE_URL: string;
  try {
    QUEUE_URL = await getQueueUrl(env);
  } catch (error) {
    if (!dryRun) throw error;
    console.warn(`[DRY-RUN] Jonon URL:n haku epäonnistui: ${(error as Error).message}. Tarkista AWS-kirjautuminen.`);
    QUEUE_URL = `suomifi-queue-${env} (ei haettu)`;
  }
  log.info(`Käytetään jonoa: ${QUEUE_URL}`);
  const viestit: SendMessageBatchRequestEntry[] = [];
  FAILED_MESSAGES.forEach(
    ({ oid, omistajaId, muistuttajaId, tyyppi, muistuttajaIdsForLahetystilaUpdate, omistajaIdsForLahetystilaUpdate }) => {
      const msg: SuomiFiSanoma = {
        oid,
        omistajaId,
        muistuttajaId,
        tyyppi,
        muistuttajaIdsForLahetystilaUpdate,
        omistajaIdsForLahetystilaUpdate,
      };

      const Id = omistajaId ? OMISTAJA_PREFIX + omistajaId : MUISTUTTAJA_PREFIX + muistuttajaId;
      viestit.push({ Id, MessageBody: JSON.stringify(msg) });
    }
  );

  if (viestit.length === 0) {
    log.info("Ei lähetettäviä viestejä");
    return;
  }

  if (dryRun) {
    log.info(`[DRY-RUN] Lähetettäisiin ${viestit.length} viestiä jonoon ${QUEUE_URL}`);
    viestit.forEach((v) => log.info(`[DRY-RUN] ${v.Id}:\n${JSON.stringify(JSON.parse(v.MessageBody!), null, 2)}`));
    return;
  }

  log.info(`Lähetetään ${viestit.length} viestiä uudelleen`);

  let onnistunutLkm = 0;
  let epäonnistunutLkm = 0;

  for (const viestitChunk of chunkArray(viestit, 10)) {
    const response = await getSQS().sendMessageBatch({
      QueueUrl: QUEUE_URL,
      Entries: viestitChunk,
    });

    epäonnistunutLkm += response.Failed?.length || 0;
    onnistunutLkm += response.Successful?.length || 0;

    response.Failed?.forEach((v) => {
      if (v.Id?.startsWith(OMISTAJA_PREFIX)) {
        auditLog.error("SuomiFi SQS sanoman uudelleenlähetys epäonnistui", {
          omistajaId: v.Id.substring(OMISTAJA_PREFIX.length),
          message: v.Message,
          code: v.Code,
        });
      } else {
        auditLog.error("SuomiFi SQS sanoman uudelleenlähetys epäonnistui", {
          muistuttajaId: v.Id?.substring(MUISTUTTAJA_PREFIX.length),
          message: v.Message,
          code: v.Code,
        });
      }
    });

    response.Successful?.forEach((v) => {
      if (v.Id?.startsWith(OMISTAJA_PREFIX)) {
        auditLog.info("SuomiFi SQS sanoman uudelleenlähetys onnistui", {
          omistajaId: v.Id.substring(OMISTAJA_PREFIX.length),
        });
      } else {
        auditLog.info("SuomiFi SQS sanoman uudelleenlähetys onnistui", {
          muistuttajaId: v.Id?.substring(MUISTUTTAJA_PREFIX.length),
        });
      }
    });
  }

  console.log(`Uudelleenlähetys valmis: ${onnistunutLkm} onnistui, ${epäonnistunutLkm} epäonnistui`);
}

// Suorita skripti
resendFailedMessages().catch((error) => {
  console.error("Virhe:", error);
  log.error("Uudelleenlähetys epäonnistui", { error: error.message || error });
  process.exit(1);
});
