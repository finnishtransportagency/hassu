// Contains code generated or recommended by Amazon Q
import { AxiosError } from "axios";
import {
  createHttpClient,
  SuomiFiRestClient,
  MultichannelMessageRequest,
  ElectronicMessageRequest,
  PaperMailOnlyMessageRequest,
  MessageResponse,
  PaperMailResponse,
} from "./client";
import { HaeTilaTietoResponse } from "../viranomaispalvelutwsinterface/definitions/HaeTilaTietoResponse";
import { LisaaKohteitaResponse } from "../viranomaispalvelutwsinterface/definitions/LisaaKohteitaResponse";
import { LahetaViestiResponse } from "../viranomaispalvelutwsinterface/definitions/LahetaViestiResponse";
import { HaeAsiakkaitaResponse } from "../viranomaispalvelutwsinterface/definitions/HaeAsiakkaitaResponse";
import { uuid } from "hassu-common/util/uuid";
import { Readable } from "stream";

// REST-toteutus: kun SOAP-riippuvuudet poistetaan, korvaa yllä olevat SOAP-importit näillä omilla tyypeillä:
//
// export interface SuomiFiAsiakas {
//   Tila: number;
//   attributes: { AsiakasTunnus: string; TunnusTyyppi: "SSN" | "CRN" };
// }
//
// interface HaeTilaTietoResponse {
//   HaeTilaTietoResult: { TilaKoodi: { TilaKoodi: number } };
// }
//
// interface HaeAsiakkaitaResponse {
//   HaeAsiakkaitaResult: {
//     TilaKoodi: { TilaKoodi: number };
//     Asiakkaat: { Asiakas: SuomiFiAsiakas[] };
//   };
// }
//
// interface LisaaKohteitaResponse {
//   LisaaKohteitaResult: {
//     TilaKoodi: { TilaKoodi: number; SanomaTunniste?: string };
//     Kohteet: {
//       Kohde: { Asiakas: { KohteenTila: number; attributes: { AsiakasTunnus: string; TunnusTyyppi: "SSN" | "CRN" } }[] }[];
//     };
//   };
// }
//
// interface LahetaViestiResponse {
//   LahetaViestiResult: {
//     TilaKoodi: { TilaKoodi: number; TilaKoodiKuvaus?: string; SanomaTunniste?: string };
//   };
// }

export type Viesti = {
  hetu?: string;
  ytunnus?: string;
  otsikko: string;
  sisalto: string;
  emailOtsikko?: string;
  emailSisalto?: string;
};

export type Tiedosto = {
  nimi: string;
  kuvaus: string;
  sisalto: Readable | Buffer;
};

export type PdfViesti = Viesti & {
  nimi: string;
  lahiosoite: string;
  postinumero: string;
  postitoimipaikka: string;
  maa: string;
  suunnittelustaVastaavaViranomainen?: string | null;
  tiedosto: Tiedosto;
  kustannuspaikka?: string;
};

export type Options = {
  endpoint: string;
  apiKey: string;
  viranomaisTunnus: string;
  yhteysHenkilo: string;
  palveluTunnus: string;
  laskutusTunniste: Record<string, string>;
  laskutusSalasana: Record<string, string>;
};

export type SuomiFiConfig = {
  endpoint: string;
  apikey: string;
  palvelutunnus: string;
  viranomaistunnus: string;
  yhteyshenkilo: string;
  laskutustunniste?: string;
  laskutussalasana?: string;
};

export type SuomiFiClient = {
  rajapinnanTila: () => Promise<HaeTilaTietoResponse>;
  lahetaInfoViesti: (viesti: Viesti) => Promise<LisaaKohteitaResponse>;
  lahetaViesti: (viesti: PdfViesti) => Promise<LahetaViestiResponse>;
  haeAsiakas: (tunnus: string, tunnusTyyppi: "SSN" | "CRN") => Promise<HaeAsiakkaitaResponse>;
};

export async function getSuomiFiClient(options: Options): Promise<SuomiFiClient> {
  const client = createHttpClient(options.endpoint, options.apiKey);

  return {
    rajapinnanTila: async () => {
      // REST API:ssa ei ole suoraa vastinetta HaeTilaTieto-operaatiolle.
      // Palautetaan tyhjä onnistunut vastaus.
      return { HaeTilaTietoResult: { TilaKoodi: { TilaKoodi: 0 } } };
    },
    lahetaInfoViesti: (viesti) => lahetaInfoViesti(client, options, viesti),
    haeAsiakas: (tunnus, tunnusTyyppi) => haeAsiakkaita(client, tunnus, tunnusTyyppi),
    lahetaViesti: (viesti) => lahetaViesti(client, options, viesti),
  };
}

async function haeAsiakkaita(client: SuomiFiRestClient, tunnus: string, tunnusTyyppi: "SSN" | "CRN"): Promise<HaeAsiakkaitaResponse> {
  try {
    const response = await client.postMailboxesActive([{ id: tunnus }]);
    const isActive = response.endUsersWithActiveMailbox.some((u) => u.id === tunnus);
    return {
      HaeAsiakkaitaResult: {
        TilaKoodi: { TilaKoodi: 0 },
        Asiakkaat: {
          Asiakas: [
            {
              Tila: isActive ? 300 : 310,
              attributes: { AsiakasTunnus: tunnus, TunnusTyyppi: tunnusTyyppi },
            },
          ],
        },
      },
    };
  } catch (e) {
    return {
      HaeAsiakkaitaResult: {
        TilaKoodi: { TilaKoodi: -1 },
        Asiakkaat: {
          Asiakas: [
            {
              Tila: 0,
              attributes: { AsiakasTunnus: tunnus, TunnusTyyppi: tunnusTyyppi },
            },
          ],
        },
      },
    };
  }
}

async function lahetaInfoViesti(client: SuomiFiRestClient, options: Options, viesti: Viesti): Promise<LisaaKohteitaResponse> {
  const tunnus = viesti.hetu ?? viesti.ytunnus;
  if (!tunnus) {
    throw new Error("Hetu tai y-tunnus pakollinen");
  }
  const externalId = `VLS-${uuid.v4()}`;
  const message: ElectronicMessageRequest = {
    externalId,
    recipient: { id: tunnus },
    sender: { serviceId: options.palveluTunnus },
    electronic: {
      title: viesti.otsikko,
      body: viesti.sisalto,
      bodyFormat: "Text",
      messageServiceType: "Normal",
      replyAllowedBy: "No one",
      visibility: "Normal",
      attachments: [],
      notifications: {
        senderDetailsInNotifications: "Organisation and service name",
        unreadMessageNotification: { reminder: "Default reminder" },
      },
    },
  };

  try {
    await client.postElectronicMessage(message);
    return {
      LisaaKohteitaResult: {
        TilaKoodi: { TilaKoodi: 0 },
        Kohteet: {
          Kohde: [
            {
              Asiakas: [{ KohteenTila: 200, attributes: { AsiakasTunnus: tunnus, TunnusTyyppi: viesti.hetu ? "SSN" : "CRN" } }],
            },
          ],
        },
      },
    };
  } catch (e) {
    return {
      LisaaKohteitaResult: {
        TilaKoodi: { TilaKoodi: -1 },
        Kohteet: {
          Kohde: [
            {
              Asiakas: [{ KohteenTila: 500, attributes: { AsiakasTunnus: tunnus, TunnusTyyppi: viesti.hetu ? "SSN" : "CRN" } }],
            },
          ],
        },
      },
    };
  }
}

async function toBuffer(stream: Readable | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(stream)) {
    return stream;
  }
  const chunks: Uint8Array[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (d: Buffer | string) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function getLaskutus(viesti: PdfViesti, options: Options) {
  const laskutusTunniste = viesti.suunnittelustaVastaavaViranomainen
    ? options.laskutusTunniste[viesti.suunnittelustaVastaavaViranomainen]
    : undefined;
  const laskutusSalasana = viesti.suunnittelustaVastaavaViranomainen
    ? options.laskutusSalasana[viesti.suunnittelustaVastaavaViranomainen]
    : undefined;
  if (laskutusTunniste && laskutusSalasana) {
    return {
      postiMessaging: {
        username: laskutusTunniste,
        password: laskutusSalasana,
        contactDetails: { email: options.yhteysHenkilo },
      },
      costPool: viesti.kustannuspaikka,
    };
  }
  return undefined;
}

function buildPaperMail(
  viesti: PdfViesti,
  attachmentId: string,
  printingAndEnvelopingService: NonNullable<ReturnType<typeof getLaskutus>>
) {
  return {
    colorPrinting: true,
    createAddressPage: false,
    rotateLandscapePages: false,
    twoSidedPrinting: false,
    messageServiceType: "Normal" as const,
    attachments: [{ attachmentId }],
    printingAndEnvelopingService,
    recipient: {
      address: {
        name: viesti.nimi,
        streetAddress: viesti.lahiosoite,
        zipCode: viesti.postinumero,
        city: viesti.postitoimipaikka,
        countryCode: viesti.maa,
      },
    },
    sender: {
      address: {
        name: "Väylävirasto",
        streetAddress: "PL 33",
        zipCode: "00521",
        city: "Helsinki",
        countryCode: "FI",
      },
    },
  };
}

async function lahetaViesti(client: SuomiFiRestClient, options: Options, viesti: PdfViesti): Promise<LahetaViestiResponse> {
  const tunnus = viesti.hetu ?? viesti.ytunnus;

  const externalId = `VLS-${uuid.v4()}`;
  const printingAndEnvelopingService = getLaskutus(viesti, options);
  if (!printingAndEnvelopingService) {
    throw new Error("Laskutustunniste puuttuu");
  }

  let uploadResponse;
  try {
    const fileBuffer = await toBuffer(viesti.tiedosto.sisalto);
    uploadResponse = await client.uploadAttachment(fileBuffer, viesti.tiedosto.nimi);
  } catch (e) {
    const axiosError = e instanceof AxiosError ? e : undefined;
    const errorMessage = axiosError
      ? `status=${axiosError.response?.status ?? "N/A"} data=${JSON.stringify(axiosError.response?.data ?? axiosError.message)}`
      : e instanceof Error
      ? e.message || e.stack || String(e)
      : String(e) || "Tuntematon virhe";
    return {
      LahetaViestiResult: {
        TilaKoodi: {
          TilaKoodi: -1,
          TilaKoodiKuvaus: `Liitteen lataus epäonnistui: ${errorMessage}`,
        },
      },
    };
  }

  const paperMail = buildPaperMail(viesti, uploadResponse.attachmentId, printingAndEnvelopingService);

  // TODO: tämä on valmiina, mutta ei voi vielä toteutua, koska suomifiHandlerin isOmistajanTiedotOk estää
  if (!tunnus) {
    const message: PaperMailOnlyMessageRequest = {
      externalId,
      sender: { serviceId: options.palveluTunnus },
      paperMail,
    };
    return sendAndMapResponse(client.postPaperMailMessage(message));
  }

  const message: MultichannelMessageRequest = {
    externalId,
    recipient: { id: tunnus },
    sender: { serviceId: options.palveluTunnus },
    electronic: {
      title: viesti.otsikko,
      body: viesti.sisalto,
      bodyFormat: "Text",
      messageServiceType: "Normal",
      replyAllowedBy: "No one",
      visibility: "Normal",
      attachments: [{ attachmentId: uploadResponse.attachmentId }],
      notifications: {
        senderDetailsInNotifications: "Organisation and service name",
        unreadMessageNotification: { reminder: "Default reminder" },
      },
    },
    paperMail,
  };
  return sendAndMapResponse(client.postMessage(message));
}

async function sendAndMapResponse(promise: Promise<MessageResponse | PaperMailResponse>): Promise<LahetaViestiResponse> {
  try {
    const response = await promise;
    return {
      LahetaViestiResult: {
        TilaKoodi: {
          TilaKoodi: 202,
          TilaKoodiKuvaus: `Trace ID: ${response.messageId}`,
          SanomaTunniste: response.traceId,
        },
      },
    };
  } catch (e) {
    const axiosError = e instanceof AxiosError ? e : undefined;
    const errorMessage = axiosError
      ? `status=${axiosError.response?.status ?? "N/A"} data=${JSON.stringify(axiosError.response?.data ?? axiosError.message)}`
      : e instanceof Error
      ? e.message || e.stack || String(e)
      : String(e) || "Tuntematon virhe";
    return {
      LahetaViestiResult: {
        TilaKoodi: {
          TilaKoodi: -1,
          TilaKoodiKuvaus: errorMessage,
        },
      },
    };
  }
}
