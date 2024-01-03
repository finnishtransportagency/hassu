import { eventSqsClient } from "./eventSqsClient";
import { SqsEvent, SqsEventType } from "./sqsEvent";
import { dateTimeToString, nyt } from "../util/dateUtil";
import dayjs, { Dayjs } from "dayjs";
import { getScheduler } from "../aws/clients/getScheduler";
import { config } from "../config";
import { log } from "../logger";
import { assertIsDefined } from "../util/assertions";
import {
  CreateScheduleCommand,
  CreateScheduleCommandInput,
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
            await this.addScheduleOrDeleteFromList(oid, schedules, publishOrExpireEvent, SqsEventType.END_NAHTAVILLAOLO_AINEISTOMUOKKAUS);
            break;
          case PublishOrExpireEventType.PUBLISH_HYVAKSYMISPAATOSVAIHE:
            await this.addScheduleOrDeleteFromList(
              oid,
              schedules,
              publishOrExpireEvent,
              SqsEventType.END_HYVAKSYMISPAATOS_AINEISTOMUOKKAUS
            );
            break;
          case PublishOrExpireEventType.PUBLISH_JATKOPAATOS1VAIHE:
            await this.addScheduleOrDeleteFromList(oid, schedules, publishOrExpireEvent, SqsEventType.END_JATKOPAATOS1_AINEISTOMUOKKAUS);
            break;
          case PublishOrExpireEventType.PUBLISH_JATKOPAATOS2VAIHE:
            await this.addScheduleOrDeleteFromList(oid, schedules, publishOrExpireEvent, SqsEventType.END_JATKOPAATOS2_AINEISTOMUOKKAUS);
            break;
          default:
            break;
        }
        // always create schedule for SYNCHRONIZE event
        await this.addScheduleOrDeleteFromList(oid, schedules, publishOrExpireEvent, SqsEventType.SYNCHRONIZE);
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
    eventType: SqsEventType
  ) {
    const scheduleParams = createScheduleParams(oid, event.date, eventType, event.type);
    if (!schedules[scheduleParams.scheduleName]) {
      log.info("Lisätään ajastus:" + scheduleParams.scheduleName);
      await this.triggerEventAtSpecificTime(scheduleParams, event.date, event.reason, eventType);
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
      }, {} as Record<string, ScheduleSummary>) ?? {}
    );
  }

  async triggerEventAtSpecificTime(scheduleParams: ScheduleParams, date: Dayjs, reason: string, type: SqsEventType): Promise<void> {
    const { oid, dateString, scheduleName } = scheduleParams;
    const event: SqsEvent = { oid, type, scheduleName, reason, date: dateTimeToString(date) };
    const params: CreateScheduleCommandInput = {
      FlexibleTimeWindow: { Mode: "OFF" },
      Name: scheduleName,
      GroupName: config.env,
      Target: {
        Arn: config.eventSqsArn,
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

function typeSuffix(type: SqsEventType, publishOrExpire: PublishOrExpireEventType): string {
  log.info("eventType: " + type + ", publishOrExpire: " + publishOrExpire);
  if (type == SqsEventType.END_HYVAKSYMISPAATOS_AINEISTOMUOKKAUS) {
    return "EHY";
  } else if (type == SqsEventType.END_JATKOPAATOS1_AINEISTOMUOKKAUS) {
    return "EJ1";
  } else if (type == SqsEventType.END_JATKOPAATOS2_AINEISTOMUOKKAUS) {
    return "EJ2";
  } else if (type == SqsEventType.END_NAHTAVILLAOLO_AINEISTOMUOKKAUS) {
    return "ENA";
  } else if (publishOrExpire === PublishOrExpireEventType.EXPIRE) {
    return "EXP";
  } else if (publishOrExpire === PublishOrExpireEventType.PUBLISH) {
    return "PUB";
  } else if (publishOrExpire === PublishOrExpireEventType.PUBLISH_ALOITUSKUULUTUS) {
    return "PAK";
  } else if (publishOrExpire === PublishOrExpireEventType.PUBLISH_HYVAKSYMISPAATOSVAIHE) {
    return "PHP";
  } else if (publishOrExpire === PublishOrExpireEventType.PUBLISH_JATKOPAATOS1VAIHE) {
    return "PJ1";
  } else if (publishOrExpire === PublishOrExpireEventType.PUBLISH_JATKOPAATOS2VAIHE) {
    return "PJ2";
  } else if (publishOrExpire === PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO) {
    return "PNA";
  } else if (publishOrExpire === PublishOrExpireEventType.PUBLISH_VUOROVAIKUTUS) {
    return "PVU";
  } else {
    return "PVT";
  }
}

function createScheduleParams(
  oid: string,
  date: dayjs.Dayjs,
  eventType: SqsEventType,
  publishOrExpire: PublishOrExpireEventType
): ScheduleParams {
  const dateString = formatScheduleDate(date);
  return {
    oid,
    scheduleName: cleanScheduleName(`${createScheduleNamePrefix(oid)}-${dateString}-${typeSuffix(eventType, publishOrExpire)}`),
    dateString,
  };
}

export const projektiSchedulerService = new ProjektiSchedulerService();
