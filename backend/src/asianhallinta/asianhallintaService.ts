import { parameters } from "../aws/parameters";
import { SendMessageRequest } from "@aws-sdk/client-sqs";
import { log } from "../logger";
import { getSQS } from "../aws/clients/getSQS";
import {
  AsianhallintaEvent,
  AsianhallintaSynkronointi,
  CheckAsianhallintaStateCommand,
  CheckAsianhallintaStateResponse,
  RequestType,
  AsiakirjaTyyppi,
  GetAsiaIdCommand,
} from "@hassu/asianhallinta";
import { getCorrelationId } from "../aws/monitoring";
import { projektiDatabase } from "../database/projektiDatabase";
import { uuid } from "hassu-common/util/uuid";
import { invokeLambda } from "../aws/lambda";
import { config } from "../config";
import { NotFoundError } from "hassu-common/error";
import { isVaylaAsianhallinta } from "hassu-common/isVaylaAsianhallinta";
import { getAsiatunnus } from "../projekti/projektiUtil";
import { assertIsDefined } from "../util/assertions";
import { AsianTila, Vaihe } from "hassu-common/graphql/apiModel";
import { synkronointiTilaToAsianTilaMap } from "./synkronointiTilaToAsianTilaMap";
import { DBProjekti } from "../database/model";
import { isProjektiAsianhallintaIntegrationEnabled } from "../util/isProjektiAsianhallintaIntegrationEnabled";
import { getVaylaUser } from "../user";

//prettier-ignore
class AsianhallintaService { //NOSONAR
  async saveAndEnqueueSynchronization(oid: string, synkronointi: AsianhallintaSynkronointi): Promise<void> {
    const projekti = await this.haeProjekti(oid);
    if (!(await isProjektiAsianhallintaIntegrationEnabled(projekti))) {
      return;
    }
    await projektiDatabase.setAsianhallintaSynkronointi(oid, synkronointi);
    await this.enqueueSynchronization(oid, synkronointi.asianhallintaEventId); //NOSONAR
  }

  /**
   * Jonotus on erillisenä metodina, jotta sitä voidaan kutsua testiympäristössä haluttaessa. Lopullisessa toteutuksessa kutsu tulee aina
   * saveAndEnqueueSynchronization-metodin kautta.
   */
  async enqueueSynchronization(oid: string, asianhallintaEventId: string) { //NOSONAR
    const projekti = await this.haeProjekti(oid);
    if (!(await isProjektiAsianhallintaIntegrationEnabled(projekti))) {
      return;
    }
    const sqsUrl = await parameters.getAsianhallintaSQSUrl();
    if (!sqsUrl) {
      log.warn("enqueueAsianhallintaSynchronization: sqsUrl ei löytynyt");
      return;
    }
    const body: AsianhallintaEvent = {
      oid,
      asianhallintaEventId, //NOSONAR
      correlationId: getCorrelationId() ?? uuid.v4(),
      hyvaksyja: getVaylaUser()?.uid ?? undefined,
      hyvaksyjanNimi: getVaylaUser()?.etunimi ? `${getVaylaUser()?.sukunimi} ${getVaylaUser()?.etunimi}` : undefined,
      asianNimi: projekti.velho?.nimi,
    };
    const messageParams: SendMessageRequest = {
      MessageGroupId: oid,
      MessageBody: JSON.stringify(body),
      QueueUrl: sqsUrl,
      MessageAttributes: {
        requestType: {
          DataType: "String",
          StringValue: "SYNCHRONIZATION" as RequestType,
        },
      },
    };
    log.info("enqueueAsianhallintaSynchronization", { messageParams });
    const result = await getSQS().sendMessage(messageParams);
    log.info("enqueueAsianhallintaSynchronization", { result });
  }

  async checkAsianhallintaState(oid: string, vaihe: Vaihe): Promise<AsianTila | undefined> {
    const projekti = await this.haeProjekti(oid);
    if (!(await isProjektiAsianhallintaIntegrationEnabled(projekti))) {
      return;
    }
    assertIsDefined(projekti.velho, "Projektilla pitää olla velho");
    const asiatunnus = getAsiatunnus(projekti.velho);
    if (!asiatunnus) {
      return;
    }
    assertIsDefined(asiatunnus, "Projektilla pitää olla asiatunnus");
    const body: CheckAsianhallintaStateCommand = {
      asiatunnus,
      vaylaAsianhallinta: isVaylaAsianhallinta(projekti),
      asiakirjaTyyppi: vaiheSpecificAsiakirjaTyyppi[vaihe],
      correlationId: getCorrelationId() ?? uuid.v4(),
    };
    log.info("checkAsianhallintaState", { body });
    const result = await invokeLambda("hassu-asianhallinta-" + config.env, true, this.wrapAsFakeSQSEvent(body, "CHECK"));
    if (result) {
      const response: CheckAsianhallintaStateResponse = JSON.parse(result);
      log.info("checkAsianhallintaState", { response });
      if (response.synkronointiTila) {
        return synkronointiTilaToAsianTilaMap[response.synkronointiTila];
      } else {
        log.error("checkAsianhallintaState", { response });
      }
    }
  }

  async getAsiaId(oid: string): Promise<number | undefined> {
    const projekti = await this.haeProjekti(oid);
    if (!(await isProjektiAsianhallintaIntegrationEnabled(projekti))) {
      return;
    }
    assertIsDefined(projekti.velho, "Projektilla pitää olla velho");
    const asiatunnus = getAsiatunnus(projekti.velho);
    if (!asiatunnus) {
      return;
    }
    assertIsDefined(asiatunnus, "Projektilla pitää olla asiatunnus");
    const body: GetAsiaIdCommand = {
      asiatunnus,
      vaylaAsianhallinta: isVaylaAsianhallinta(projekti),
      correlationId: getCorrelationId() ?? uuid.v4(),
    };
    log.info("getAsiaId", { body });
    const result = await invokeLambda("hassu-asianhallinta-" + config.env, true, this.wrapAsFakeSQSEvent(body, "GET_ASIA_ID"));
    log.info("getAsiaId", { result });
    if (result) {
      const response: CheckAsianhallintaStateResponse = JSON.parse(result);
      if (response.asiaId) {
        log.info("getAsiaId", { response });
        return response.asiaId;
      } else {
        log.error("getAsiaId", { response });
      }
    }
  }

  private async haeProjekti(oid: string): Promise<DBProjekti> {
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (!projekti) {
      throw new NotFoundError("Projektia ei löydy");
    }
    return projekti;
  }

  private wrapAsFakeSQSEvent(body: unknown, requestType: RequestType) {
    return JSON.stringify({
      Records: [
        {
          body: JSON.stringify(body),
          messageAttributes: {
            requestType: {
              dataType: "String",
              stringValue: requestType,
            },
          },
        },
      ],
    });
  }
}

const vaiheSpecificAsiakirjaTyyppi: Record<Vaihe, AsiakirjaTyyppi> = {
  ALOITUSKUULUTUS: "ALOITUSKUULUTUS",
  SUUNNITTELU: "YLEISOTILAISUUS_KUTSU",
  NAHTAVILLAOLO: "NAHTAVILLAOLOKUULUTUS",
  HYVAKSYMISPAATOS: "HYVAKSYMISPAATOSKUULUTUS",
  JATKOPAATOS: "JATKOPAATOSKUULUTUS",
  JATKOPAATOS2: "JATKOPAATOSKUULUTUS2",
};

export const asianhallintaService = new AsianhallintaService(); //NOSONAR
