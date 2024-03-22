import { SSM } from "@aws-sdk/client-ssm";
import { SuomiFiClient, SuomiFiConfig, getSuomiFiClient } from "../src/suomifi/viranomaispalvelutwsinterface/suomifi";
import express from "express";
import fs from "fs";
import { LisaaKohteitaResponse, HaeAsiakkaitaResponse } from "../src/suomifi/viranomaispalvelutwsinterface";
import { SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { parseLaskutus } from "../src/suomifi/suomifiHandler";

const app = express();
const port = 8081;
const localEndpoint = `http://localhost:${port}`;

app.post("/tila", (req, res) => {
  res.send(
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
      <soapenv:Header xmlns:asi="http://www.suomi.fi/asiointitili"/>
      <soapenv:Body xmlns:asi="http://www.suomi.fi/asiointitili">
        <asi:HaeTilaTietoResponse>
          <asi:HaeTilaTietoResult>
            <asi:TilaKoodi>
              <asi:TilaKoodi>0</asi:TilaKoodi>
              <asi:TilaKoodiKuvaus>OK</asi:TilaKoodiKuvaus>
              <asi:SanomaTunniste>sanomatunniste</asi:SanomaTunniste>
            </asi:TilaKoodi>
          </asi:HaeTilaTietoResult>
        </asi:HaeTilaTietoResponse>
      </soapenv:Body>
    </soapenv:Envelope>`
  );
});
app.post("/kohde", (req, res) => {
  res.send(`
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
      <soapenv:Header xmlns:asi="http://www.suomi.fi/asiointitili"/>
      <soap:Body xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <asi:LisaaKohteitaResponse xmlns:asi="http://www.suomi.fi/asiointitili">
          <asi:LisaaKohteitaResult>
            <asi:TilaKoodi>
              <asi:TilaKoodi>0</asi:TilaKoodi>
              <asi:TilaKoodiKuvaus>New messages created</asi:TilaKoodiKuvaus>
              <asi:SanomaTunniste>1524044968_211225566</asi:SanomaTunniste>
            </asi:TilaKoodi>
            <asi:KohdeMaara>1</asi:KohdeMaara>
            <asi:Kohteet>
              <asi:Kohde>
                <asi:ViranomaisTunniste>Vaka-1524-0449-6821-1225-566</asi:ViranomaisTunniste>
                <asi:Asiakas AsiakasTunnus="010120-3319" TunnusTyyppi="SSN">
                  <asi:AsiointitiliTunniste>574909</asi:AsiointitiliTunniste>
                  <asi:KohteenTila>200</asi:KohteenTila>
                  <asi:KohteenTilaKuvaus>Asia on tallennettuna ja näkyy asiakkaalle.</asi:KohteenTilaKuvaus>
                </asi:Asiakas>
              </asi:Kohde>
            </asi:Kohteet>
          </asi:LisaaKohteitaResult>
        </asi:LisaaKohteitaResponse>
      </soap:Body>
  </soapenv:Envelope>`);
});

app.post("/viesti", (req, res) => {
  res.send(`
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
      <soapenv:Header xmlns:asi="http://www.suomi.fi/asiointitili"/>
      <soapenv:Body xmlns:asi="http://www.suomi.fi/asiointitili">
        <LahetaViestiResponse xmlns="http://www.suomi.fi/asiointitili" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <LahetaViestiResult>
            <TilaKoodi>
              <TilaKoodi>202</TilaKoodi>
              <TilaKoodiKuvaus>Asia tallennettuna asiointitilipalvelun käsittelyjonoon, mutta se ei vielä näy asiakkaan asiointitilillä. </TilaKoodiKuvaus>
              <SanomaTunniste>1519043354_997202863</SanomaTunniste>
            </TilaKoodi>
          </LahetaViestiResult>
        </LahetaViestiResponse>
      </soapenv:Body>
    </soapenv:Envelope>`);
});

app.post("/hae", (req, res) => {
  res.send(`
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
      <soapenv:Header xmlns:asi="http://www.suomi.fi/asiointitili"/>
      <soapenv:Body xmlns:asi="http://www.suomi.fi/asiointitili">
        <asi:HaeAsiakkaitaResponse>
          <asi:HaeAsiakkaitaResult>
            <asi:TilaKoodi>
              <asi:TilaKoodi>0</asi:TilaKoodi>
              <asi:TilaKoodiKuvaus>Onnistui</asi:TilaKoodiKuvaus>
              <asi:SanomaTunniste>1524033786_837807286</asi:SanomaTunniste>
            </asi:TilaKoodi>
            <asi:Asiakkaat>
              <asi:Asiakas AsiakasTunnus="010101-0101" TunnusTyyppi="SSN">
                <asi:Tila>300</asi:Tila>
                <asi:TilaPvm>2018-02-22T11:00:41.143+02:00</asi:TilaPvm>
                <asi:TiliPassivoitu>0</asi:TiliPassivoitu>
              </asi:Asiakas>
              <asi:Asiakas AsiakasTunnus="010101-123N" TunnusTyyppi="SSN">
                <asi:Tila>300</asi:Tila>
                <asi:TilaPvm>2018-04-18T10:16:34.877+03:00</asi:TilaPvm>
                <asi:TiliPassivoitu>0</asi:TiliPassivoitu>
              </asi:Asiakas>
            </asi:Asiakkaat>
          </asi:HaeAsiakkaitaResult>
        </asi:HaeAsiakkaitaResponse>
      </soapenv:Body>
    </soapenv:Envelope>`);
});
app.post("/fault", (req, res) => {
  res.status(500).send(`
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
      <soapenv:Header xmlns:asi="http://www.suomi.fi/asiointitili"/>
      <soapenv:Body xmlns:asi="http://www.suomi.fi/asiointitili">
        <soapenv:Fault>
          <faultcode>server</faultcode>
          <faultstring>temporary exception</faultstring>
        </soapenv:Fault>
      </soapenv:Body>
    </soapenv:Envelope>`);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

function isHaeAsiakkaitaResponse(response: any): response is HaeAsiakkaitaResponse {
  return "HaeAsiakkaitaResult" in response;
}

function isLisaaKohteitaResponse(response: any): response is LisaaKohteitaResponse {
  return "LisaaKohteitaResult" in response;
}

let soapClient: SuomiFiClient | undefined;
const euWestSSMClient = new SSM({ region: "eu-west-1" });
euWestSSMClient
  .getParameter({
    Name: "SuomiFiCertificate",
    WithDecryption: true,
  })
  .catch((e) => {
    throw new Error("SuomiFiCertificate not found");
  })
  .then((output) => {
    return output.Parameter?.Value;
  })
  .then((cert) => {
    return euWestSSMClient
      .getParameter({
        Name: "SuomiFiPrivateKey",
        WithDecryption: true,
      })
      .catch((e) => {
        throw new Error("SuomiFiPrivateKey not found");
      })
      .then((output) => {
        return output.Parameter?.Value;
      })
      .then((key) => {
        return euWestSSMClient
          .getParameter({
            Name: "SuomiFiConfig",
            WithDecryption: true,
          })
          .catch((e) => {
            throw new Error("SuomiFiConfig not found");
          })
          .then((output) => {
            return output.Parameter?.Value;
          })
          .then((config) => {
            if (config && key && cert) {
              const partialCfg: Partial<SuomiFiConfig> = {
                laskutustunniste: `${SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO}:123456,${SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY}:456789`,
                laskutussalasana: `${SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO}:secret1,${SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY}:secret2`,
              };
              config.split("\n").forEach((e) => {
                const v = e.split("=");
                partialCfg[v[0] as keyof SuomiFiConfig] = v[1].trim();
              });
              const cfg = partialCfg as SuomiFiConfig;
              const sign = process.argv.includes("--sign");
              let endpoint: string | undefined;
              if (process.argv.includes("--dryRun")) {
                endpoint = `${localEndpoint}/${process.argv[2] ?? "tila"}`;
              } else {
                endpoint = sign ? cfg.endpoint : cfg.endpoint + "NonSigned";
              }
              return getSuomiFiClient({
                endpoint,
                apiKey: cfg.apikey,
                privateKey: sign ? key : undefined,
                publicCertificate: sign ? cert : undefined,
                viranomaisTunnus: cfg.viranomaistunnus,
                palveluTunnus: cfg.palvelutunnus,
                laskutusTunniste: parseLaskutus(partialCfg.laskutustunniste),
                laskutusSalasana: parseLaskutus(partialCfg.laskutussalasana),
              }).then((client) => {
                soapClient = client;
                if (process.argv.length === 2 || process.argv[2] === "tila") {
                  return client.rajapinnanTila();
                } else if (process.argv[2] === "kohde") {
                  return client.lahetaInfoViesti({
                    hetu: "010280-952L",
                    otsikko: "VLS viestin otsikko",
                    sisalto: "VLS viestin sisältö",
                  });
                } else if (process.argv[2] === "viesti") {
                  return client.lahetaViesti({
                    hetu: "010280-952L",
                    lahiosoite: "Henrikintie 14 B",
                    nimi: "Tessa Testilä",
                    postinumero: "00370",
                    postitoimipaikka: "HELSINKI",
                    maa: "FI",
                    otsikko: "VLS PDF viestin otsikko",
                    sisalto: "VLS PDF viestin sisältö",
                    tiedosto: { kuvaus: "Tiedoston kuvaus", nimi: "tiedosto.pdf", sisalto: fs.readFileSync(process.argv[3]) },
                    suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
                  });
                } else if (process.argv[2] === "hae") {
                  return client.haeAsiakas("010280-952L", "SSN");
                } else if (process.argv[2] === "fault") {
                  return client.rajapinnanTila();
                } else {
                  return new Promise((_resolve, reject) => reject("Väärä toiminto!"));
                }
              });
            }
          });
      });
  })
  .then((response) => {
    if (process.argv.includes("--debug")) {
      console.log("XML Request: " + soapClient?.getSoapClient().lastRequest);
      console.log("XML Response: " + soapClient?.getSoapClient().lastResponse);
    }
    if (isHaeAsiakkaitaResponse(response)) {
      console.log(response.HaeAsiakkaitaResult?.TilaKoodi);
      response.HaeAsiakkaitaResult?.Asiakkaat?.Asiakas?.forEach((a) => console.log(a));
    } else if (isLisaaKohteitaResponse(response)) {
      console.log(response.LisaaKohteitaResult?.TilaKoodi);
      response.LisaaKohteitaResult?.Kohteet?.Kohde?.forEach((a) => console.log(a));
    } else {
      console.log("Response", response);
    }
    process.exit(0);
  })
  .catch((e) => {
    console.error("Error", e);
    process.exit(1);
  });
