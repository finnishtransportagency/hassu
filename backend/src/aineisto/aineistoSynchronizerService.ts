import { aineistoImporterClient } from "./aineistoImporterClient";
import { ImportAineistoEvent, ImportAineistoEventType } from "./importAineistoEvent";
import { parseDate } from "../util/dateUtil";
import dayjs, { Dayjs } from "dayjs";
import { getScheduler } from "../aws/clients/getScheduler";
import { config } from "../config";
import { log } from "../logger";

class AineistoSynchronizerService {
  async synchronizeProjektiFiles(oid: string) {
    await aineistoImporterClient.importAineisto({
      type: ImportAineistoEventType.SYNCHRONIZE,
      oid,
    });
  }

  async synchronizeProjektiFilesAtSpecificTime(date: Dayjs, oid: string): Promise<void> {
    const startOfDate = date.startOf("day");
    const dateString = startOfDate.format("YYYY-MM-DDTHH:mm:ss");
    const scheduleName = createScheduleName(oid, dateString);
    const event: ImportAineistoEvent = { oid, type: ImportAineistoEventType.SYNCHRONIZE, scheduleName };
    await getScheduler()
      .createSchedule({
        FlexibleTimeWindow: { Mode: "OFF" },
        Name: scheduleName,
        Target: {
          Arn: config.aineistoImportSqsArn,
          RoleArn: config.schedulerExecutionRoleArn,
          Input: JSON.stringify(event),
          SqsParameters: { MessageGroupId: oid },
        },
        ScheduleExpression: "at(" + dateString + ")",
        ScheduleExpressionTimezone: process.env.TZ,
      })
      .promise();
  }

  async deletePastSchedule(scheduleName: string) {
    await getScheduler().deleteSchedule({ Name: scheduleName }).promise();
  }

  async synchronizeProjektiFilesAtSpecificDate(oid: string, kuulutusPaiva: string) {
    const date = parseDate(kuulutusPaiva);
    if (date.isBefore(dayjs())) {
      // Jos kuulutuspäivä menneisyydessä, kutsu synkronointia heti
      await this.synchronizeProjektiFiles(oid);
    } else {
      await this.synchronizeProjektiFilesAtSpecificTime(date, oid);
    }
  }

  async deleteAllSchedules(oid: string) {
    const scheduler = getScheduler();
    const schedules = await scheduler.listSchedules().promise();
    log.info("All schedules", schedules);
    const scheduleNamePrefix = createScheduleName(oid);
    await Promise.all(
      schedules.Schedules.map(async (schedule) => {
        if (schedule.Name?.startsWith(scheduleNamePrefix)) {
          log.info("Deleting schedule " + schedule.Name);
          return scheduler.deleteSchedule({ Name: schedule.Name }).promise();
        }
      })
    );
  }
}

function createScheduleName(oid: string, dateString?: string) {
  let name = `P${oid}`;
  if (dateString) {
    name = `${name}-${dateString}`;
  }
  return name.replace(/[^a-zA-Z0-9]/g, "-");
}

export const aineistoSynchronizerService = new AineistoSynchronizerService();
