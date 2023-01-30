import { CommonKutsuAdapter, CommonKutsuAdapterProps, LokalisoituYhteystieto } from "./commonKutsuAdapter";
import { SuunnitteluSopimus, SuunnitteluSopimusJulkaisu, VuorovaikutusKierrosJulkaisu } from "../../database/model";
import { assertIsDefined } from "../../util/assertions";
import { kuntametadata } from "../../../../common/kuntametadata";
import { AsiakirjanMuoto } from "../asiakirjaTypes";

export interface SuunnitteluVaiheKutsuAdapterProps extends CommonKutsuAdapterProps {
  vuorovaikutusKierrosJulkaisu?: VuorovaikutusKierrosJulkaisu;
  suunnitteluSopimus?: SuunnitteluSopimus | SuunnitteluSopimusJulkaisu;
}

export const ASIAKIRJA_KUTSU_PREFIX = "asiakirja.kutsu_vuorovaikutukseen.";

export class SuunnitteluVaiheKutsuAdapter extends CommonKutsuAdapter {
  private readonly vuorovaikutusKierrosJulkaisu?: VuorovaikutusKierrosJulkaisu;
  private readonly suunnitteluSopimus?: SuunnitteluSopimus | SuunnitteluSopimusJulkaisu;

  constructor(props: SuunnitteluVaiheKutsuAdapterProps) {
    super(props);
    const { vuorovaikutusKierrosJulkaisu, suunnitteluSopimus } = props;
    this.vuorovaikutusKierrosJulkaisu = vuorovaikutusKierrosJulkaisu;
    this.suunnitteluSopimus = suunnitteluSopimus;
  }

  get subject(): string {
    return this.text(ASIAKIRJA_KUTSU_PREFIX + "otsikko");
  }

  get vuorovaikutusJulkaisuPvm(): string {
    assertIsDefined(this.vuorovaikutusKierrosJulkaisu?.vuorovaikutusJulkaisuPaiva);
    return new Date(this.vuorovaikutusKierrosJulkaisu.vuorovaikutusJulkaisuPaiva).toLocaleDateString("fi");
  }

  get yhteystiedotVuorovaikutus(): LokalisoituYhteystieto[] {
    return this.yhteystiedot(this.vuorovaikutusKierrosJulkaisu?.yhteystiedot || []);
  }

  get kutsujat(): string | undefined {
    const kutsuja = this.kutsuja();
    if (!kutsuja) {
      return;
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
}
