import { Viranomainen } from "./Viranomainen";
import { Kysely } from "./Kysely";

/** HaeAsiakkaita */
export interface HaeAsiakkaita {
    /** Viranomainen */
    Viranomainen?: Viranomainen;
    /** Kysely */
    Kysely?: Kysely;
}
