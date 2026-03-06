import type { PaatosVaiheJulkaisu } from "./hyvaksymisPaatosVaihe";
import { AloitusKuulutusJulkaisu } from "./aloituskuulutus";
import { NahtavillaoloVaiheJulkaisu } from "./nahtavillaoloVaihe";

export type AnyKuulutusJulkaisu = AloitusKuulutusJulkaisu | NahtavillaoloVaiheJulkaisu | PaatosVaiheJulkaisu;
export type AnyProjektiDataItem = AnyKuulutusJulkaisu;
export type ProjektiDataItemSortKey = AnyProjektiDataItem["sortKey"];
