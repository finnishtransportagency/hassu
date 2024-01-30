import { Viranomainen } from "./Viranomainen";
import { Kysely1 } from "./Kysely1";

/** LisaaKohteita */
export interface LisaaKohteita {
    /** Viranomainen */
    Viranomainen?: Viranomainen;
    /** Kysely */
    Kysely?: Kysely1;
}
