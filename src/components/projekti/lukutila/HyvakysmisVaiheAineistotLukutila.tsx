import { HyvaksymisPaatosVaiheJulkaisu } from "common/graphql/apiModel";
import { ReactElement } from "react";
import { formatDate } from "src/util/dateUtils";

type Props = {
  hyvaksymisPaatosVaiheJulkaisu: HyvaksymisPaatosVaiheJulkaisu;
};

export default function HyvaksymisVaiheAineistotLukutila({ hyvaksymisPaatosVaiheJulkaisu }: Props): ReactElement {
  return (
    <>
      <p className="vayla-label">Päätös ja sen liitteenä oleva aineisto</p>
      <p>
        Päätökset ja aineistot ovat olleet nähtävillä palvelun julkisella puolella {formatDate(hyvaksymisPaatosVaiheJulkaisu.kuulutusPaiva)}
        —{formatDate(hyvaksymisPaatosVaiheJulkaisu.kuulutusVaihePaattyyPaiva)} välisen ajan. Päätös löytyy asianhallinnasta ja liiteenä
        olevat aineistot Projektivelhosta.
      </p>
    </>
  );
}
