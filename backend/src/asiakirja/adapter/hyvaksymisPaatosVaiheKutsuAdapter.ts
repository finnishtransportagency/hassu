import { CommonKutsuAdapter, CommonKutsuAdapterProps } from "./commonKutsuAdapter";
import { Yhteystieto } from "../../database/model";

export interface HyvaksymisPaatosVaiheKutsuAdapterProps extends CommonKutsuAdapterProps {
  kuulutusPaiva: string;
  kuulutusVaihePaattyyPaiva?: string;
  yhteystiedot: Yhteystieto[];
}

export class HyvaksymisPaatosVaiheKutsuAdapter extends CommonKutsuAdapter {
  private props: HyvaksymisPaatosVaiheKutsuAdapterProps;

  constructor(props: HyvaksymisPaatosVaiheKutsuAdapterProps) {
    super(props);
    this.props = props;
  }

  get kuulutusPaiva(): string {
    return this.props.kuulutusPaiva ? new Date(this.props.kuulutusPaiva).toLocaleDateString("fi") : "DD.MM.YYYY";
  }
}
