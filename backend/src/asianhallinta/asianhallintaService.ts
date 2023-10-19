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
} from "@hassu/asianhallinta";
import { getCorrelationId } from "../aws/monitoring";
import { projektiDatabase } from "../database/projektiDatabase";
import { uuid } from "../util/uuid";
import { invokeLambda } from "../aws/lambda";
import { config } from "../config";
import { NotFoundError } from "hassu-common/error";
import { getAsiatunnus } from "../projekti/projektiUtil";
import { assertIsDefined } from "../util/assertions";
import { AsianTila, SuunnittelustaVastaavaViranomainen, Vaihe } from "hassu-common/graphql/apiModel";
import { synkronointiTilaToAsianTilaMap } from "./synkronointiTilaToAsianTilaMap";

class AsianhallintaService {
  async saveAndEnqueueSynchronization(oid: string, synkronointi: AsianhallintaSynkronointi): Promise<void> {
    if (!(await parameters.isAsianhallintaIntegrationEnabled())) {
      return;
    }
    await projektiDatabase.setAsianhallintaSynkronointi(oid, synkronointi);
    await this.enqueueSynchronization(oid, synkronointi.asianhallintaEventId);
  }

  /**
   * Jonotus on erillisenä metodina, jotta sitä voidaan kutsua testiympäristössä haluttaessa. Lopullisessa toteutuksessa kutsu tulee aina
   * saveAndEnqueueSynchronization-metodin kautta.
   */
  async enqueueSynchronization(oid: string, asianhallintaEventId: string) {
    if (!(await parameters.isAsianhallintaIntegrationEnabled())) {
      return;
    }
    const sqsUrl = await parameters.getAsianhallintaSQSUrl();
    if (!sqsUrl) {
      log.warn("enqueueAsianhallintaSynchronization: sqsUrl ei löytynyt");
      return;
    }
    const body: AsianhallintaEvent = {
      oid,
      asianhallintaEventId,
      correlationId: getCorrelationId() || uuid.v4(),
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
    if (!(await parameters.isAsianhallintaIntegrationEnabled())) {
      return;
    }
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (!projekti) {
      throw new NotFoundError("Projektia ei löydy");
    }
    assertIsDefined(projekti.velho, "Projektilla pitää olla velho");
    const asiatunnus = getAsiatunnus(projekti.velho);
    assertIsDefined(asiatunnus, "Projektilla pitää olla asiatunnus");
    const isVaylaAsianhallinta = projekti.velho.suunnittelustaVastaavaViranomainen == SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO;
    const body: CheckAsianhallintaStateCommand = {
      asiatunnus,
      vaylaAsianhallinta: isVaylaAsianhallinta,
      asiakirjaTyyppi: vaiheSpecificAsiakirjaTyyppi[vaihe],
      correlationId: getCorrelationId() ?? uuid.v4(),
    };
    log.info("checkAsianhallintaState", { body });
    const result = await invokeLambda("hassu-asianhallinta-" + config.env, true, this.wrapAsFakeSQSEvent(body));
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

  private wrapAsFakeSQSEvent(body: unknown) {
    return JSON.stringify({
      Records: [
        {
          body: JSON.stringify(body),
          messageAttributes: {
            requestType: {
              dataType: "String",
              stringValue: "CHECK" as RequestType,
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
  JATKOPAATOS: "JATKOPAATOS1KUULUTUS",
  JATKOPAATOS2: "JATKOPAATOS2KUULUTUS",
};

export const asianhallintaService = new AsianhallintaService();
