import { LokalisoituYhteystieto } from "./commonKutsuAdapter";
import { SuunnitteluSopimus, SuunnitteluSopimusJulkaisu, VuorovaikutusKierrosJulkaisu, Yhteystieto } from "../../database/model";
import { assertIsDefined } from "../../util/assertions";
import { kuntametadata } from "hassu-common/kuntametadata";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { KuulutusKutsuAdapter, KuulutusKutsuAdapterProps } from "./kuulutusKutsuAdapter";

export interface SuunnitteluVaiheKutsuAdapterProps extends KuulutusKutsuAdapterProps {
  vuorovaikutusKierrosJulkaisu?: VuorovaikutusKierrosJulkaisu;
  suunnitteluSopimus?: SuunnitteluSopimus | SuunnitteluSopimusJulkaisu;
  kuulutettuYhdessaSuunnitelmanimi: string | undefined;
  kuulutusPaiva?: string;
  yhteystiedot?: Yhteystieto[];
}

export const ASIAKIRJA_KUTSU_PREFIX = "asiakirja.kutsu_vuorovaikutukseen.";

export class SuunnitteluVaiheKutsuAdapter extends KuulutusKutsuAdapter<SuunnitteluVaiheKutsuAdapterProps> {
  private readonly vuorovaikutusKierrosJulkaisu?: VuorovaikutusKierrosJulkaisu;
  protected readonly kuulutettuYhdessaSuunnitelmanimi: string | undefined;
  readonly suunnitteluSopimus?: SuunnitteluSopimusJulkaisu | SuunnitteluSopimus | null;

  constructor(props: SuunnitteluVaiheKutsuAdapterProps) {
    super(props);
    const { vuorovaikutusKierrosJulkaisu, suunnitteluSopimus, kuulutettuYhdessaSuunnitelmanimi } = props;
    this.vuorovaikutusKierrosJulkaisu = vuorovaikutusKierrosJulkaisu;
    this.suunnitteluSopimus = suunnitteluSopimus;
    this.kuulutettuYhdessaSuunnitelmanimi = kuulutettuYhdessaSuunnitelmanimi;
  }

  get kuulutusNimiCapitalized(): string {
    return "Kutsu vuorovaikutukseen";
  }

  get kuulutusYllapitoUrl(): string {
    return super.kutsuUrl;
  }

  isUseitaOsapuolia(): boolean {
    return (this.suunnitteluSopimus?.osapuolet?.length ?? 0) > 1;
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
    return super.kuuluttaja;
  }

  get kuuluttaja_pitka(): string {
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
