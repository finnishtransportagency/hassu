#!/usr/bin/env ts-node

import { PublishOrExpireEventType } from "../../backend/src/sqsEvents/projektiScheduleManager";
import * as fs from "fs";

type LogEntry = {
  "@timestamp": string;
  msg: string;
  "@message": {
    level: string;
    time: string;
    correlationId: string;
    tag: string;
    sanoma: {
      omistajaId?: string;
      muistuttajaId?: string;
      tyyppi: PublishOrExpireEventType;
      oid: string;
      muistuttajaIdsForLahetystilaUpdate: string[];
      omistajaIdsForLahetystilaUpdate: string[];
    };
    msg: string;
  };
};

type FailedMessage = {
  oid: string;
  omistajaId?: string;
  muistuttajaId?: string;
  tyyppi: PublishOrExpireEventType;
  muistuttajaIdsForLahetystilaUpdate: string[];
  omistajaIdsForLahetystilaUpdate: string[];
};

function parseLogData(jsonData: LogEntry[]): FailedMessage[] {
  return jsonData.map((entry) => ({
    oid: entry["@message"].sanoma.oid,
    omistajaId: entry["@message"].sanoma.omistajaId,
    muistuttajaId: entry["@message"].sanoma.muistuttajaId,
    tyyppi: entry["@message"].sanoma.tyyppi,
    muistuttajaIdsForLahetystilaUpdate: entry["@message"].sanoma.muistuttajaIdsForLahetystilaUpdate,
    omistajaIdsForLahetystilaUpdate: entry["@message"].sanoma.omistajaIdsForLahetystilaUpdate,
  }));
}

function loadFailedMessagesFromFile(filePath: string): FailedMessage[] {
  try {
    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf8")) as LogEntry[];
    return parseLogData(jsonData);
  } catch (error) {
    console.error(`Virhe luettaessa tiedostoa ${filePath}:`, error);
    return [];
  }
}

export { parseLogData, loadFailedMessagesFromFile, LogEntry, FailedMessage };
