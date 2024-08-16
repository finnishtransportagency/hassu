import { TilasiirtymaTyyppi, Vaihe } from "@services/api";

export const tilaSiirtymaTyyppiToVaiheMap: Record<TilasiirtymaTyyppi, Vaihe> = {
  ALOITUSKUULUTUS: Vaihe.ALOITUSKUULUTUS,
  VUOROVAIKUTUSKIERROS: Vaihe.SUUNNITTELU,
  NAHTAVILLAOLO: Vaihe.NAHTAVILLAOLO,
  HYVAKSYMISPAATOSVAIHE: Vaihe.HYVAKSYMISPAATOS,
  JATKOPAATOS_1: Vaihe.JATKOPAATOS,
  JATKOPAATOS_2: Vaihe.JATKOPAATOS2,
};
