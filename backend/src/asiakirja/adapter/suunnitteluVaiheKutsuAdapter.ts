import { CommonKutsuAdapter, CommonKutsuAdapterProps, LokalisoituYhteystieto } from "./commonKutsuAdapter";
import { SuunnitteluSopimus, SuunnitteluSopimusJulkaisu, VuorovaikutusKierrosJulkaisu } from "../../database/model";
import { assertIsDefined } from "../../util/assertions";
import { kuntametadata } from "hassu-common/kuntametadata";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { formatProperNoun } from "hassu-common/util/formatProperNoun";

export interface SuunnitteluVaiheKutsuAdapterProps extends CommonKutsuAdapterProps {
  vuorovaikutusKierrosJulkaisu?: VuorovaikutusKierrosJulkaisu;
  suunnitteluSopimus?: SuunnitteluSopimus | SuunnitteluSopimusJulkaisu;
  kuulutettuYhdessaSuunnitelmanimi: string | undefined;
}

export const ASIAKIRJA_KUTSU_PREFIX = "asiakirja.kutsu_vuorovaikutukseen.";

export class SuunnitteluVaiheKutsuAdapter extends CommonKutsuAdapter {
  private readonly vuorovaikutusKierrosJulkaisu?: VuorovaikutusKierrosJulkaisu;
  protected readonly kuulutettuYhdessaSuunnitelmanimi: string | undefined;

  constructor(props: SuunnitteluVaiheKutsuAdapterProps) {
    super(props);
    const { vuorovaikutusKierrosJulkaisu, suunnitteluSopimus, kuulutettuYhdessaSuunnitelmanimi } = props;
    this.vuorovaikutusKierrosJulkaisu = vuorovaikutusKierrosJulkaisu;
    this.suunnitteluSopimus = suunnitteluSopimus;
    this.kuulutettuYhdessaSuunnitelmanimi = kuulutettuYhdessaSuunnitelmanimi;
  }

  get subject(): string {
    return this.text(ASIAKIRJA_KUTSU_PREFIX + "otsikko");
  }

  get vuorovaikutusJulkaisuPvm(): string {
    assertIsDefined(this.vuorovaikutusKierrosJulkaisu?.vuorovaikutusJulkaisuPaiva);
    return new Date(this.vuorovaikutusKierrosJulkaisu.vuorovaikutusJulkaisuPaiva).toLocaleDateString("fi");
  }

  get yhteystiedotVuorovaikutus(): LokalisoituYhteystieto[] {
    return this.yhteystiedot(this.vuorovaikutusKierrosJulkaisu?.yhteystiedot ?? []);
  }

  get kutsujat(): string | undefined {
    const kutsuja = this.kutsuja();
    if (!kutsuja) {
      return undefined;
    }

    if (this.suunnitteluSopimus) {
      if (this.suunnitteluSopimus.kunta) {
        const kunta = kuntametadata.nameForKuntaId(this.suunnitteluSopimus.kunta, this.kieli);
        const ja = this.text("ja");
        return kunta + " " + ja + " " + kutsuja;
      } else if (this.suunnitteluSopimus.osapuolet && this.suunnitteluSopimus.osapuolet.length > 0) {
        const osapuoliNimet = this.suunnitteluSopimus.osapuolet
          .map((osapuoli) => {
            if (this.kieli === "RUOTSI") {
              return osapuoli.osapuolenNimiSV;
            } else {
              return osapuoli.osapuolenNimiFI;
            }
          })
          .filter((nimi) => nimi && nimi.trim() !== "");

        if (osapuoliNimet.length === 0) {
          return kutsuja;
        } else if (osapuoliNimet.length === 1) {
          const ja = this.text("ja");
          return osapuoliNimet[0] + " " + ja + " " + kutsuja;
        } else if (osapuoliNimet.length === 2) {
          const ja = this.text("ja");
          return osapuoliNimet[0] + ", " + osapuoliNimet[1] + " " + ja + " " + kutsuja;
        } else {
          const ja = this.text("ja");
          return osapuoliNimet.join(", ") + " " + ja + " " + kutsuja;
        }
      }
    }
    return kutsuja;
  }

  get lakiviite_ilmoitus(): string {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return this.text(ASIAKIRJA_KUTSU_PREFIX + "lakiviite_ilmoitus_rata");
    }
    return this.text(ASIAKIRJA_KUTSU_PREFIX + "lakiviite_ilmoitus_tie");
  }

  get kuuluttaja(): string {
    const suunnitteluSopimus = this.suunnitteluSopimus;
    if (suunnitteluSopimus) {
      if (suunnitteluSopimus.kunta) {
        return formatProperNoun(kuntametadata.nameForKuntaId(suunnitteluSopimus.kunta, this.kieli));
      } else if (suunnitteluSopimus.osapuolet && suunnitteluSopimus.osapuolet.length > 0) {
        const osapuoliNimet = suunnitteluSopimus.osapuolet
          .map((osapuoli) => {
            if (this.kieli === "RUOTSI") {
              return osapuoli.osapuolenNimiSV;
            } else {
              return osapuoli.osapuolenNimiFI;
            }
          })
          .filter((nimi) => nimi && nimi.trim() !== "");

        if (osapuoliNimet.length === 0) {
          return super.kuuluttaja;
        } else if (osapuoliNimet.length === 1) {
          return formatProperNoun(osapuoliNimet[0] as any);
        } else if (osapuoliNimet.length === 2) {
          const ja = this.text("ja");
          return formatProperNoun(osapuoliNimet[0] as any) + " " + ja + " " + formatProperNoun(osapuoliNimet[1] as any);
        } else {
          const ja = this.text("ja");
          const viimeinenNimi = osapuoliNimet.pop();
          return (
            osapuoliNimet.map((nimi) => formatProperNoun(nimi as any)).join(", ") + " " + ja + " " + formatProperNoun(viimeinenNimi as any)
          );
        }
      }
    }
    return super.kuuluttaja;
  }

  get kuuluttaja_pitka(): string {
    const suunnitteluSopimus = this.suunnitteluSopimus;
    if (suunnitteluSopimus) {
      if (suunnitteluSopimus?.kunta) {
        return formatProperNoun(kuntametadata.nameForKuntaId(suunnitteluSopimus.kunta, this.kieli));
      } else if (suunnitteluSopimus.osapuolet && suunnitteluSopimus.osapuolet.length > 0) {
        const osapuoliNimet = suunnitteluSopimus.osapuolet
          .map((osapuoli) => {
            if (this.kieli === "RUOTSI") {
              return osapuoli.osapuolenNimiSV;
            } else {
              return osapuoli.osapuolenNimiFI;
            }
          })
          .filter((nimi) => nimi && nimi.trim() !== "");

        if (osapuoliNimet.length === 0) {
          return super.kuuluttaja_pitka;
        } else if (osapuoliNimet.length === 1) {
          return formatProperNoun(osapuoliNimet[0] as any);
        } else if (osapuoliNimet.length === 2) {
          const ja = this.text("ja");
          return formatProperNoun(osapuoliNimet[0] as any) + " " + ja + " " + formatProperNoun(osapuoliNimet[1] as any);
        } else {
          const ja = this.text("ja");
          const viimeinenNimi = osapuoliNimet.pop();
          return (
            osapuoliNimet.map((nimi) => formatProperNoun(nimi as any)).join(", ") + " " + ja + " " + formatProperNoun(viimeinenNimi as any)
          );
        }
      }
    }
    return super.kuuluttaja_pitka;
  }

  get selosteVuorovaikutuskierrokselle(): string | undefined {
    const seloste = this.vuorovaikutusKierrosJulkaisu?.selosteVuorovaikutuskierrokselle;
    if (!seloste) {
      return undefined;
    }
    return seloste;
  }
}
