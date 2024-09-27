import { Viranomainen } from "./Viranomainen";
import { Kysely2 } from "./Kysely2";

/** HaeTilaTieto */
export interface HaeTilaTieto {
  /** Viranomainen */
  Viranomainen?: Viranomainen;
  /** Kysely */
  Kysely?: Kysely2;
}
