import { eventSqsClient } from "./eventSqsClient";
import { ScheduledEvent, ScheduledEventType } from "./scheduledEvent";
import { nyt } from "../util/dateUtil";
import dayjs from "dayjs";
import { getScheduler } from "../aws/clients/getScheduler";
import { config } from "../config";
import { log } from "../logger";
import { assertIsDefined } from "../util/assertions";
import {
  CreateScheduleCommand,
  DeleteScheduleCommand,
  ListSchedulesCommand,
  ListSchedulesCommandOutput,
  ScheduleSummary,
} from "@aws-sdk/client-scheduler";
import { values } from "lodash";
import { projektiDatabase } from "../database/projektiDatabase";
import { ProjektiScheduleManager, PublishOrExpireEvent, PublishOrExpireEventType } from "./projektiScheduleManager";

class ProjektiSchedulerService {
  async synchronizeProjektiFiles(oid: string) {
    await eventSqsClient.synchronizeAineisto(oid);
  }

  public async updateProjektiSynchronizationSchedule(oid: string) {
    const projekti = await projektiDatabase.loadProjektiByOid(oid, true);
    assertIsDefined(projekti);
    const schedule = new ProjektiScheduleManager(projekti).getSchedule();
    log.info("updateProjektiSynchronizationSchedule", { schedule });
    const now = nyt();
    const schedules = await this.listAllSchedulesForProjektiAsAMap(oid);
    log.info("AWS:ssä olevat schedulet", { schedules });

    // Create missing schedules
    for (const publishOrExpireEvent of schedule) {
      if (!publishOrExpireEvent.date.isBefore(now)) {
        switch (publishOrExpireEvent.type) {
          case PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO:
            await this.addScheduleOrDeleteFromList(
              oid,
              schedules,
              publishOrExpireEvent,
              ScheduledEventType.END_NAHTAVILLAOLO_AINEISTOMUOKKAUS
            );
            break;
          case PublishOrExpireEventType.PUBLISH_HYVAKSYMISPAATOSVAIHE:
            await this.addScheduleOrDeleteFromList(
              oid,
              schedules,
              publishOrExpireEvent,
              ScheduledEventType.END_HYVAKSYMISPAATOS_AINEISTOMUOKKAUS
            );
            break;
          case PublishOrExpireEventType.PUBLISH_JATKOPAATOS1VAIHE:
            await this.addScheduleOrDeleteFromList(
              oid,
              schedules,
              publishOrExpireEvent,
              ScheduledEventType.END_JATKOPAATOS1_AINEISTOMUOKKAUS
            );
            break;
          case PublishOrExpireEventType.PUBLISH_JATKOPAATOS2VAIHE:
            await this.addScheduleOrDeleteFromList(
              oid,
              schedules,
              publishOrExpireEvent,
              ScheduledEventType.END_JATKOPAATOS2_AINEISTOMUOKKAUS
            );
            break;
          default:
            break;
        }
        // always create schedule for SYNCHRONIZE event
        await this.addScheduleOrDeleteFromList(oid, schedules, publishOrExpireEvent, ScheduledEventType.SYNCHRONIZE);
      }
    }

    // Remove leftover schedules
    const scheduler = getScheduler();
    await Promise.all(
      values(schedules).map(async (sch) => {
        log.info("Poistetaan ajastus:" + sch.Name);
        assertIsDefined(sch.Name);
        return scheduler.send(new DeleteScheduleCommand({ Name: sch.Name, GroupName: sch.GroupName }));
      })
    );
  }

  private async addScheduleOrDeleteFromList(
    oid: string,
    schedules: Record<string, ScheduleSummary>,
    event: PublishOrExpireEvent,
    eventType: ScheduledEventType
  ) {
    const scheduleParams = createScheduleParams(oid, event.date, eventType);
    if (!schedules[scheduleParams.scheduleName]) {
      log.info("Lisätään ajastus:" + scheduleParams.scheduleName);
      await this.triggerEventAtSpecificTime(scheduleParams, event.reason, eventType);
    } else {
      delete schedules[scheduleParams.scheduleName];
    }
  }

  private async listAllSchedulesForProjektiAsAMap(oid: string) {
    const listSchedulesCommandOutput = await this.listAllSchedules(oid);
    return (
      listSchedulesCommandOutput?.Schedules?.reduce((result: Record<string, ScheduleSummary>, sch: ScheduleSummary) => {
        assertIsDefined(sch.Name);
        result[sch.Name] = sch;
        return result;
      }, {} as Record<string, ScheduleSummary>) || {}
    );
  }

  async triggerEventAtSpecificTime(scheduleParams: ScheduleParams, reason: string, type: ScheduledEventType): Promise<void> {
    const { oid, dateString, scheduleName } = scheduleParams;
    const event: ScheduledEvent = { oid, type, scheduleName, reason };
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
    await getScheduler().send(new CreateScheduleCommand(params));
  }

  async deletePastSchedule(scheduleName: string) {
    try {
      await getScheduler().send(new DeleteScheduleCommand({ Name: scheduleName, GroupName: config.env }));
    } catch (e) {
      // Älä välitä. Schedule voi olla poistettu jo edellisellä yrityksellä.
      log.info(e);
    }
  }

  async deleteAllSchedules(oid: string) {
    const schedules = await this.listAllSchedules(oid);
    log.info("All schedules", schedules);
    const scheduler = getScheduler();
    if (schedules.Schedules) {
      await Promise.all(
        schedules.Schedules.map(async (schedule: ScheduleSummary) => {
          log.info("Deleting schedule " + schedule.Name);
          assertIsDefined(schedule.Name);
          return scheduler.send(new DeleteScheduleCommand({ Name: schedule.Name, GroupName: schedule.GroupName }));
        })
      );
    }
  }

  private async listAllSchedules(oid: string): Promise<ListSchedulesCommandOutput> {
    const scheduler = getScheduler();
    const scheduleNamePrefix = createScheduleNamePrefix(oid);
    return scheduler.send(new ListSchedulesCommand({ NamePrefix: scheduleNamePrefix, GroupName: config.env }));
  }
}

function cleanScheduleName(name: string) {
  return name.replace(/[^a-zA-Z0-9]/g, "-");
}

function createScheduleNamePrefix(oid: string) {
  return cleanScheduleName(`P${oid}`);
}

type ScheduleParams = { oid: string; scheduleName: string; dateString: string };

function formatScheduleDate(date: dayjs.Dayjs): string {
  return date.format("YYYY-MM-DDTHH:mm:ss");
}

function createScheduleParams(oid: string, date: dayjs.Dayjs, eventType: ScheduledEventType): ScheduleParams {
  const dateString = formatScheduleDate(date);
  return { oid, scheduleName: cleanScheduleName(`${createScheduleNamePrefix(oid)}-${dateString}-${eventType}`), dateString };
}

export const projektiSchedulerService = new ProjektiSchedulerService();
