import { Viranomainen } from "./Viranomainen";
import { Kysely3 } from "./Kysely3";

/** LahetaViesti */
export interface LahetaViesti {
    /** Viranomainen */
    Viranomainen?: Viranomainen;
    /** Kysely */
    Kysely?: Kysely3;
}
