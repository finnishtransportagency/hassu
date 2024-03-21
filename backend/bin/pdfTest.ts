import { AsiakirjaTyyppi, Kieli } from "hassu-common/graphql/apiModel";
import { GeneratePDFEvent } from "../src/asiakirja/lambda/generatePDFEvent";
import { handleEvent } from "../src/asiakirja/lambda/pdfGeneratorHandler";
import { projektiDatabase } from "../src/database/projektiDatabase";
import fs from "fs";
import { KasittelynTila, SuunnitteluSopimus } from "../src/database/model";
import { generatePdf } from "../src/suomifi/suomifiHandler";
import { PublishOrExpireEventType } from "../src/sqsEvents/projektiScheduleManager";

process.env.USE_SSM = "true";
projektiDatabase
  .loadProjektiByOid(process.argv[2])
  .then((projekti) => {
    if (projekti) {
      const osoite = process.argv.includes("--address");
      const ruotsi = process.argv.includes("--sv");
      const ipost = process.argv.includes("--ipost");
      const hyvaksymisPaatosExists = projekti.hyvaksymisPaatosVaiheJulkaisut && projekti.hyvaksymisPaatosVaiheJulkaisut.length > 0;
      if (ipost) {
        return generatePdf(
          projekti,
          hyvaksymisPaatosExists ? PublishOrExpireEventType.PUBLISH_HYVAKSYMISPAATOSVAIHE : PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO,
          {
            id: "1",
            nimi: "Tessa Testilä Pitkääääää Pitkää Pitkääääää Pitkääääää",
            lahiosoite: "Henrikintie 14 B",
            postinumero: "00370",
            postitoimipaikka: "HELSINKI",
            maakoodi: "FI",
          }
        ).then((pdf) => {
          return {
            __typename: "PDF",
            nimi: pdf?.tiedostoNimi as string,
            sisalto: pdf?.file.toString("base64") as string,
            textContent: "",
          };
        });
      }
      if (!hyvaksymisPaatosExists && projekti.nahtavillaoloVaiheJulkaisut) {
        const generateEvent: GeneratePDFEvent = {
          createNahtavillaoloKuulutusPdf: {
            asiakirjaTyyppi: AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
            asianhallintaPaalla: !(projekti.asianhallinta?.inaktiivinen ?? true),
            kayttoOikeudet: projekti.kayttoOikeudet,
            kieli: ruotsi ? Kieli.RUOTSI : Kieli.SUOMI,
            linkkiAsianhallintaan: undefined,
            luonnos: false,
            lyhytOsoite: projekti.lyhytOsoite,
            nahtavillaoloVaihe: projekti.nahtavillaoloVaiheJulkaisut[projekti.nahtavillaoloVaiheJulkaisut.length - 1],
            oid: projekti.oid,
            velho: projekti.velho!,
            vahainenMenettely: projekti.vahainenMenettely,
            euRahoitusLogot: projekti.euRahoitusLogot,
            suunnitteluSopimus: projekti.suunnitteluSopimus as SuunnitteluSopimus | undefined,
            osoite: osoite
              ? {
                  nimi: "Tessa Testilä Pitkääääää Pitkää Pitkääääää Pitkääääää",
                  katuosoite: "Henrikintie 14 B",
                  postinumero: "00370",
                  postitoimipaikka: "HELSINKI",
                }
              : undefined,
          },
        };
        return handleEvent(generateEvent);
      } else if (projekti.hyvaksymisPaatosVaiheJulkaisut) {
        const generateEvent: GeneratePDFEvent = {
          createHyvaksymisPaatosKuulutusPdf: {
            asiakirjaTyyppi: AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE,
            asianhallintaPaalla: !(projekti.asianhallinta?.inaktiivinen ?? true),
            kayttoOikeudet: projekti.kayttoOikeudet,
            kieli: ruotsi ? Kieli.RUOTSI : Kieli.SUOMI,
            linkkiAsianhallintaan: undefined,
            luonnos: false,
            lyhytOsoite: projekti.lyhytOsoite,
            hyvaksymisPaatosVaihe: projekti.hyvaksymisPaatosVaiheJulkaisut[projekti.hyvaksymisPaatosVaiheJulkaisut.length - 1],
            oid: projekti.oid,
            euRahoitusLogot: projekti.euRahoitusLogot,
            osoite: osoite
              ? {
                  nimi: "Tessa Testilä Pitkääääää Pitkää Pitkääääää Pitkääääää",
                  katuosoite: "Henrikintie 14 B",
                  postinumero: "00370",
                  postitoimipaikka: "HELSINKI",
                }
              : undefined,
            kasittelynTila: projekti.kasittelynTila as KasittelynTila,
          },
        };
        return handleEvent(generateEvent);
      }
    }
    throw new Error("Projektia ei löydy, tai siltä puuttuu pakollisia tietoja");
  })

  .then((response) => {
    console.log("Tiedoston nimi: " + response.nimi);
    if (response.sisalto) {
      fs.writeFileSync("testpdf.pdf", Buffer.from(response.sisalto, "base64"));
    }
  })
  .catch((e) => console.error(e));
