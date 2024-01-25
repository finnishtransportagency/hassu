import { WSSecurityCert } from "soap";
import { ViranomaispalvelutWsInterfaceClient, createClientAsync } from "./client";
import { HaeTilaTietoResponse } from "./definitions/HaeTilaTietoResponse";
import { LisaaKohteitaResponse } from "./definitions/LisaaKohteitaResponse";
import { Viranomainen } from "./definitions/Viranomainen";
import dayjs from "dayjs";
import { uuid } from "hassu-common/util/uuid";
import { LahetaViestiResponse } from "./definitions/LahetaViestiResponse";
import { Readable } from "stream";
import { HaeAsiakkaitaResponse } from "./definitions/HaeAsiakkaitaResponse";

export type Viesti = {
  hetu?: string;
  ytunnus?: string;
  otsikko: string;
  sisalto: string;
  emailOtsikko?: string;
  emailSisalto?: string;
  nimi: string;
  lahiosoite: string;
  postinumero: string;
  postitoimipaikka: string;
  maa: string;
};

export type Tiedosto = {
  nimi: string;
  kuvaus: string;
  sisalto: Readable | Buffer;
};

export type PdfViesti = Viesti & {
  tiedosto: Tiedosto;
};

export type Options = {
  endpoint: string;
  privateKey?: string;
  publicCertificate?: string;
  viranomaisTunnus?: string;
  palveluTunnus?: string;
};

export type SuomiFiConfig = {
  endpoint?: string;
  palvelutunnus?: string;
  viranomaistunnus?: string;
};

export type SuomiFiClient = {
  rajapinnanTila: () => Promise<HaeTilaTietoResponse>;
  lahetaInfoViesti: (viesti: Viesti) => Promise<LisaaKohteitaResponse>;
  lahetaViesti: (viesti: PdfViesti) => Promise<LahetaViestiResponse>;
  haeAsiakas: (hetu: string) => Promise<HaeAsiakkaitaResponse>;
};

export async function getSuomiFiClient(options: Options): Promise<SuomiFiClient> {
  const client = await createClientAsync(__dirname + "/ViranomaispalvelutWSInterface.wsdl", undefined, options.endpoint);
  if (options.privateKey && options.publicCertificate) {
    client.setSecurity(new WSSecurityCert(options.privateKey, options.publicCertificate, undefined));
  }
  return {
    rajapinnanTila: () => {
      return haeTilaTieto(client, options);
    },
    lahetaInfoViesti: (viesti) => {
      return lisaaKohteita(client, options, viesti);
    },
    haeAsiakas: (hetu) => {
      return haeAsiakkaita(client, options, hetu);
    },
    lahetaViesti: (viesti) => {
      return lahetaViesti(client, options, viesti);
    },
  };
}

function getViranomainen(options: Options): Viranomainen {
  return {
    KayttajaTunnus: "VLS",
    PalveluTunnus: options.palveluTunnus ?? "VLS",
    ViranomaisTunnus: options.viranomaisTunnus ?? "VLS",
    SanomaVersio: "1.0",
    SanomaVarmenneNimi: process.env.ENVIRONMENT === "prod" ? "vayliensuunnittelu.fi" : "hassudev.testivaylapilvi.fi",
    SanomaTunniste: uuid.v4(),
  };
}

async function haeTilaTieto(client: ViranomaispalvelutWsInterfaceClient, options: Options): Promise<HaeTilaTietoResponse> {
  const response = await client.HaeTilaTietoAsync({
    Kysely: {},
    Viranomainen: getViranomainen(options),
  });
  return response[0];
}

async function lisaaKohteita(
  client: ViranomaispalvelutWsInterfaceClient,
  options: Options,
  viesti: Viesti
): Promise<LisaaKohteitaResponse> {
  const tunnus = viesti.hetu || viesti.ytunnus;
  if (!tunnus) {
    throw new Error("Hetu tai y-tunnus pakollinen");
  }
  const response = await client.LisaaKohteitaAsync({
    Kysely: {
      KohdeMaara: "1",
      Kohteet: {
        Kohde: [
          {
            Asiakas: [
              {
                attributes: { AsiakasTunnus: tunnus, TunnusTyyppi: viesti.hetu ? "SSN" : "CRN" },
                Osoite: {
                  Lahiosoite: viesti.lahiosoite,
                  Postinumero: viesti.postinumero,
                  Postitoimipaikka: viesti.postitoimipaikka,
                  Maa: viesti.maa,
                  Nimi: viesti.nimi,
                },
              },
            ],
            ViranomaisTunniste: `VLS-${uuid.v4()}`,
            Nimeke: viesti.otsikko,
            LahettajaNimi: "Väylävirasto",
            LahetysPvm: dayjs(new Date()).format("YYYY-MM-DDTHH:mm:ssZ"),
            KuvausTeksti: viesti.sisalto,
            EmailLisatietoOtsikko: viesti.emailOtsikko,
            EmailLisatietoSisalto: viesti.emailSisalto,
            Viestityyppi: "2",
            VaadiLukukuittaus: "0",
            VahvistusVaatimus: "0",
          },
        ],
      },
    },
    Viranomainen: getViranomainen(options),
  });
  return response[0];
}

async function toBase64(stream: Readable | Buffer): Promise<string> {
  const chunks: string[] = [];
  return new Promise((resolve, reject) => {
    if (stream instanceof Readable) {
      stream.on("data", (d) => chunks.push(d));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.from(chunks.join("")).toString("base64")));
    } else {
      resolve(stream.toString("base64"));
    }
  });
}

async function lahetaViesti(
  client: ViranomaispalvelutWsInterfaceClient,
  options: Options,
  viesti: PdfViesti
): Promise<LahetaViestiResponse> {
  const tunnus = viesti.hetu || viesti.ytunnus;
  if (!tunnus) {
    throw new Error("Hetu tai y-tunnus pakollinen");
  }
  const response = await client.LahetaViestiAsync({
    Kysely: {
      Paperi: "false",
      Kohteet: {
        Kohde: [
          {
            Asiakas: [
              {
                attributes: { AsiakasTunnus: tunnus, TunnusTyyppi: viesti.hetu ? "SSN" : "CRN" },
                Osoite: {
                  Lahiosoite: viesti.lahiosoite,
                  Postinumero: viesti.postinumero,
                  Postitoimipaikka: viesti.postitoimipaikka,
                  Maa: viesti.maa,
                  Nimi: viesti.nimi,
                },
              },
            ],
            ViranomaisTunniste: `VLS-${uuid.v4()}`,
            Nimeke: viesti.otsikko,
            LahetysPvm: dayjs(new Date()).format("YYYY-MM-DDTHH:mm:ssZ"),
            KuvausTeksti: viesti.sisalto,
            EmailLisatietoOtsikko: viesti.emailOtsikko,
            EmailLisatietoSisalto: viesti.emailSisalto,
            LisaaOsoitesivu: "true",
            VaadiLukukuittaus: "0",
            VahvistusVaatimus: "0",
            Tiedostot: {
              Tiedosto: [
                {
                  TiedostoNimi: viesti.tiedosto.nimi,
                  TiedostoSisalto: await toBase64(viesti.tiedosto.sisalto),
                  TiedostonKuvaus: viesti.tiedosto.kuvaus,
                  TiedostoMuoto: "application/pdf",
                },
              ],
            },
          },
        ],
      },
      Tulostustoimittaja: "Posti",
      Laskutus: { Salasana: "xxx", Tunniste: "yyyy" },
      Varitulostus: "false",
    },
    Viranomainen: getViranomainen(options),
  });
  return response[0];
}

async function haeAsiakkaita(client: ViranomaispalvelutWsInterfaceClient, options: Options, hetu: string): Promise<HaeAsiakkaitaResponse> {
  const response = await client.HaeAsiakkaitaAsync({
    Kysely: {
      KyselyLaji: "Asiakkaat",
      Asiakkaat: { Asiakas: [{ attributes: { AsiakasTunnus: hetu, TunnusTyyppi: "SSN" } }] },
    },
    Viranomainen: getViranomainen(options),
  });
  return response[0];
}