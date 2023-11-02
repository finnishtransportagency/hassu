import { VaiheTiedostoManager } from ".";
import { HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu } from "../../database/model";

export abstract class AbstractHyvaksymisPaatosVaiheTiedostoManager extends VaiheTiedostoManager<
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu
> {}
