import { CommonKutsuAdapter, CommonKutsuAdapterProps, LokalisoituYhteystieto } from "./commonKutsuAdapter";
import { LocalizedMap, SuunnitteluSopimus, SuunnitteluSopimusJulkaisu, VuorovaikutusKierrosJulkaisu } from "../../database/model";
import { assertIsDefined } from "../../util/assertions";
import { kuntametadata } from "hassu-common/kuntametadata";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { formatProperNoun } from "hassu-common/util/formatProperNoun";
import { Kieli } from "hassu-common/graphql/apiModel";

export interface SuunnitteluVaiheKutsuAdapterProps extends CommonKutsuAdapterProps {
  vuorovaikutusKierrosJulkaisu?: VuorovaikutusKierrosJulkaisu;
  suunnitteluSopimus?: SuunnitteluSopimus | SuunnitteluSopimusJulkaisu;
  kuulutettuYhdessaSuunnitelmanimi: LocalizedMap<string> | undefined;
}

export const ASIAKIRJA_KUTSU_PREFIX = "asiakirja.kutsu_vuorovaikutukseen.";

export class SuunnitteluVaiheKutsuAdapter extends CommonKutsuAdapter {
  private readonly vuorovaikutusKierrosJulkaisu?: VuorovaikutusKierrosJulkaisu;
  private readonly suunnitteluSopimus?: SuunnitteluSopimus | SuunnitteluSopimusJulkaisu;
  protected readonly kuulutettuYhdessaSuunnitelmanimi: string | undefined;

  constructor(props: SuunnitteluVaiheKutsuAdapterProps) {
    super(props);
    const { vuorovaikutusKierrosJulkaisu, suunnitteluSopimus, kuulutettuYhdessaSuunnitelmanimi } = props;
    this.vuorovaikutusKierrosJulkaisu = vuorovaikutusKierrosJulkaisu;
    this.suunnitteluSopimus = suunnitteluSopimus;
    this.kuulutettuYhdessaSuunnitelmanimi =
      kuulutettuYhdessaSuunnitelmanimi?.[this.kieli] ?? kuulutettuYhdessaSuunnitelmanimi?.[Kieli.SUOMI];
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
      const kunta = kuntametadata.nameForKuntaId(this.suunnitteluSopimus.kunta, this.kieli);
      const ja = this.text("ja");
      return kutsuja + " " + ja + " " + kunta;
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
    if (suunnitteluSopimus?.kunta) {
      return formatProperNoun(kuntametadata.nameForKuntaId(suunnitteluSopimus.kunta, this.kieli));
    }
    return super.kuuluttaja;
  }

  get kuuluttaja_pitka(): string {
    const suunnitteluSopimus = this.suunnitteluSopimus;
    if (suunnitteluSopimus?.kunta) {
      return formatProperNoun(kuntametadata.nameForKuntaId(suunnitteluSopimus.kunta, this.kieli));
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
