import { aineistoImporterClient } from "./aineistoImporterClient";
import { ImportAineistoEvent, ImportAineistoEventType } from "./importAineistoEvent";
import { parseDate } from "../util/dateUtil";
import dayjs, { Dayjs } from "dayjs";
import { getScheduler } from "../aws/clients/getScheduler";
import { config } from "../config";
import { log } from "../logger";
import { DBProjekti } from "../database/model";
import { ProjektiAineistoManager } from "./projektiAineistoManager";
import { assertIsDefined } from "../util/assertions";
import { ScheduleSummary } from "aws-sdk/clients/scheduler";
import { uniqBy, values } from "lodash";

class AineistoSynchronizerService {
  async synchronizeProjektiFiles(oid: string) {
    await aineistoImporterClient.importAineisto({
      type: ImportAineistoEventType.SYNCHRONIZE,
      oid,
    });
  }

  private async updateProjektiSynchronizationSchedule(projekti: DBProjekti) {
    const schedule = uniqBy(new ProjektiAineistoManager(projekti).getSchedule(), (event) => event.date); // Poista duplikaatit
    const now = dayjs();
    const oid = projekti.oid;
    const schedules = await this.listAllSchedulesForProjektiAsAMap(oid);

    // Create missing schedules
    for (const publishOrExpireEvent of schedule) {
      if (publishOrExpireEvent.date.isAfter(now)) {
        const scheduleParams = createScheduleParams(oid, publishOrExpireEvent.date);
        if (!schedules[scheduleParams.scheduleName]) {
          log.info("Lisätään ajastus:" + scheduleParams.scheduleName);
          await this.synchronizeProjektiFilesAtSpecificTime(scheduleParams);
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

  async synchronizeProjektiFilesAtSpecificTime(scheduleParams: ScheduleParams): Promise<void> {
    const { oid, dateString, scheduleName } = scheduleParams;
    const event: ImportAineistoEvent = { oid, type: ImportAineistoEventType.SYNCHRONIZE, scheduleName };
    await getScheduler()
      .createSchedule({
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
      })
      .promise();
  }

  async deletePastSchedule(scheduleName: string) {
    try {
      await getScheduler().deleteSchedule({ Name: scheduleName, GroupName: config.env }).promise();
    } catch (e) {
      // Älä välitä. Schedule voi olla poistettu jo edellisellä yrityksellä.
      log.info(e);
    }
  }

  async synchronizeProjektiFilesAtSpecificDate(projekti: DBProjekti, kuulutusPaiva?: string | null) {
    const date = kuulutusPaiva ? parseDate(kuulutusPaiva) : undefined;
    if (!date || date.isBefore(dayjs())) {
      // Jos kuulutuspäivä menneisyydessä, kutsu synkronointia heti
      await this.synchronizeProjektiFiles(projekti.oid);
    }
    await this.updateProjektiSynchronizationSchedule(projekti);
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
    return scheduler.listSchedules({ NamePrefix: scheduleNamePrefix }).promise();
  }
}

function cleanScheduleName(name: string) {
  return name.replace(/[^a-zA-Z0-9]/g, "-");
}

function createScheduleNamePrefix(oid: string) {
  return cleanScheduleName(`P${oid}`);
}

type ScheduleParams = { oid: string; scheduleName: string; dateString: string };

function createScheduleParams(oid: string, date: Dayjs): ScheduleParams {
  const dateString = date.format("YYYY-MM-DDTHH:mm:ss");
  return { oid, scheduleName: cleanScheduleName(`${createScheduleNamePrefix(oid)}-${dateString}`), dateString };
}

export const aineistoSynchronizerService = new AineistoSynchronizerService();
