import { CommonKutsuAdapter, CommonKutsuAdapterProps, LokalisoituYhteystieto } from "./commonKutsuAdapter";
import { SuunnitteluSopimus, SuunnitteluSopimusJulkaisu, VuorovaikutusKierrosJulkaisu } from "../../database/model";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { assertIsDefined } from "../../util/assertions";

export interface SuunnitteluVaiheKutsuAdapterProps extends CommonKutsuAdapterProps {
  vuorovaikutusKierrosJulkaisu?: VuorovaikutusKierrosJulkaisu;
  suunnitteluSopimus?: SuunnitteluSopimus | SuunnitteluSopimusJulkaisu;
}

export class SuunnitteluVaiheKutsuAdapter extends CommonKutsuAdapter {
  private readonly vuorovaikutusKierrosJulkaisu?: VuorovaikutusKierrosJulkaisu;

  constructor(props: SuunnitteluVaiheKutsuAdapterProps) {
    super(props);
    const { vuorovaikutusKierrosJulkaisu } = props;
    this.vuorovaikutusKierrosJulkaisu = vuorovaikutusKierrosJulkaisu;
  }

  get subject(): string {
    return {
      [AsiakirjanMuoto.TIE]: "SUUNNITELMAN LAATIJAN KUTSUSTA YLEISÖTILAISUUTEEN ILMOITTAMINEN",
      [AsiakirjanMuoto.RATA]: "",
    }[this.asiakirjanMuoto];
  }

  get vuorovaikutusJulkaisuPvm(): string {
    assertIsDefined(this.vuorovaikutusKierrosJulkaisu?.vuorovaikutusJulkaisuPaiva);
    return new Date(this.vuorovaikutusKierrosJulkaisu.vuorovaikutusJulkaisuPaiva).toLocaleDateString("fi");
  }

  get yhteystiedotVuorovaikutus(): LokalisoituYhteystieto[] {
    return this.yhteystiedot(this.vuorovaikutusKierrosJulkaisu?.yhteystiedot || []);
  }
}
