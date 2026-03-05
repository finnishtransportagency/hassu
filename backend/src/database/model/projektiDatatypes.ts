import type { ProjektiMeta } from "./projektiMeta";
import type { PaatosVaiheJulkaisu } from "./hyvaksymisPaatosVaihe";
import { AloitusKuulutusJulkaisu } from "./aloituskuulutus";
import { NahtavillaoloVaiheJulkaisu } from "./nahtavillaoloVaihe";

export type AnyKuulutusJulkaisu = AloitusKuulutusJulkaisu | NahtavillaoloVaiheJulkaisu | PaatosVaiheJulkaisu;
export type AnyProjektiDataItem = ProjektiMeta | AnyKuulutusJulkaisu;
export type ProjektiDataItemSortKey = AnyProjektiDataItem["sortKey"];
