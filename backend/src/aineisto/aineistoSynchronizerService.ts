import { aineistoImporterClient } from "./aineistoImporterClient";
import { ImportAineistoEvent, ImportAineistoEventType } from "./importAineistoEvent";
import { parseDate } from "../util/dateUtil";
import dayjs from "dayjs";
import { getScheduler } from "../aws/clients/getScheduler";
import { config } from "../config";
import { log } from "../logger";
import { ProjektiAineistoManager } from "./projektiAineistoManager";
import { assertIsDefined } from "../util/assertions";
import { ScheduleSummary } from "aws-sdk/clients/scheduler";
import { values } from "lodash";
import { projektiDatabase } from "../database/projektiDatabase";

class AineistoSynchronizerService {
  async synchronizeProjektiFiles(oid: string) {
    await aineistoImporterClient.importAineisto({
      type: ImportAineistoEventType.SYNCHRONIZE,
      oid,
    });
  }

  private async updateProjektiSynchronizationSchedule(oid: string) {
    const projekti = await projektiDatabase.loadProjektiByOid(oid, true);
    assertIsDefined(projekti);
    const schedule = new ProjektiAineistoManager(projekti).getSchedule();
    log.info("updateProjektiSynchronizationSchedule", { schedule });
    const now = dayjs();
    const schedules = await this.listAllSchedulesForProjektiAsAMap(oid);
    log.info("AWS:ssä olevat schedulet", { schedules });

    // Create missing schedules
    for (const publishOrExpireEvent of schedule) {
      if (publishOrExpireEvent.date.isAfter(now)) {
        const scheduleParams = createScheduleParams(oid, publishOrExpireEvent.date);
        if (!schedules[scheduleParams.scheduleName]) {
          log.info("Lisätään ajastus:" + scheduleParams.scheduleName);
          await this.synchronizeProjektiFilesAtSpecificTime(scheduleParams, publishOrExpireEvent.reason);
        } else {
          delete schedules[scheduleParams.scheduleName];
        }
      }
    }

    // Remove leftover schedules
    const scheduler = getScheduler();
    await Promise.all(
      values(schedules).map(async (sch) => {
        log.info("Poistetaan ajastus:" + sch.Name);
        assertIsDefined(sch.Name);
        return scheduler.deleteSchedule({ Name: sch.Name, GroupName: sch.GroupName }).promise();
      })
    );
  }

  private async listAllSchedulesForProjektiAsAMap(oid: string) {
    return (await this.listAllSchedules(oid)).Schedules.reduce((result, sch) => {
      assertIsDefined(sch.Name);
      result[sch.Name] = sch;
      return result;
    }, {} as Record<string, ScheduleSummary>);
  }

  async synchronizeProjektiFilesAtSpecificTime(scheduleParams: ScheduleParams, reason: string): Promise<void> {
    const { oid, dateString, scheduleName } = scheduleParams;
    const event: ImportAineistoEvent = { oid, type: ImportAineistoEventType.SYNCHRONIZE, scheduleName, reason };
    const params = {
      FlexibleTimeWindow: { Mode: "OFF" },
      Name: scheduleName,
      GroupName: config.env,
      Target: {
        Arn: config.aineistoImportSqsArn,
        RoleArn: config.schedulerExecutionRoleArn,
        Input: JSON.stringify(event),
        SqsParameters: { MessageGroupId: oid },
      },
      ScheduleExpression: "at(" + dateString + ")",
      ScheduleExpressionTimezone: process.env.TZ,
    };
    log.info("createSchedule", { params });
    await getScheduler().createSchedule(params).promise();
  }

  async deletePastSchedule(scheduleName: string) {
    try {
      await getScheduler().deleteSchedule({ Name: scheduleName, GroupName: config.env }).promise();
    } catch (e) {
      // Älä välitä. Schedule voi olla poistettu jo edellisellä yrityksellä.
      log.info(e);
    }
  }

  async synchronizeProjektiFilesAtSpecificDate(oid: string, kuulutusPaiva?: string | null) {
    const date = kuulutusPaiva ? parseDate(kuulutusPaiva) : undefined;
    if (!date || date.isBefore(dayjs())) {
      // Jos kuulutuspäivä menneisyydessä, kutsu synkronointia heti
      await this.synchronizeProjektiFiles(oid);
    }
    await this.updateProjektiSynchronizationSchedule(oid);
  }

  async deleteAllSchedules(oid: string) {
    const schedules = await this.listAllSchedules(oid);
    log.info("All schedules", schedules);
    const scheduler = getScheduler();
    await Promise.all(
      schedules.Schedules.map(async (schedule) => {
        log.info("Deleting schedule " + schedule.Name);
        assertIsDefined(schedule.Name);
        return scheduler.deleteSchedule({ Name: schedule.Name, GroupName: schedule.GroupName }).promise();
      })
    );
  }

  private async listAllSchedules(oid: string) {
    const scheduler = getScheduler();
    const scheduleNamePrefix = createScheduleNamePrefix(oid);
    return scheduler.listSchedules({ NamePrefix: scheduleNamePrefix, GroupName: config.env }).promise();
  }
}

function cleanScheduleName(name: string) {
  return name.replace(/[^a-zA-Z0-9]/g, "-");
}

function createScheduleNamePrefix(oid: string) {
  return cleanScheduleName(`P${oid}`);
}

type ScheduleParams = { oid: string; scheduleName: string; dateString: string };

export function formatScheduleDate(date: dayjs.Dayjs) {
  return date.format("YYYY-MM-DDTHH:mm:ss");
}

function createScheduleParams(oid: string, date: dayjs.Dayjs): ScheduleParams {
  const dateString = formatScheduleDate(date);
  return { oid, scheduleName: cleanScheduleName(`${createScheduleNamePrefix(oid)}-${dateString}`), dateString };
}

export const aineistoSynchronizerService = new AineistoSynchronizerService();
