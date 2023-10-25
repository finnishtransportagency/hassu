import { VaiheAineisto } from ".";
import { HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu } from "../../database/model";

export abstract class AbstractHyvaksymisPaatosVaiheAineisto extends VaiheAineisto<HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu> {}
