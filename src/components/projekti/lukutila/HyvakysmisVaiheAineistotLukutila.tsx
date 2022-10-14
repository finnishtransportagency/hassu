import ExtLink from "@components/ExtLink";
import { HyvaksymisPaatosVaiheJulkaisu } from "common/graphql/apiModel";
import { ReactElement } from "react";
import { formatDate } from "src/util/dateUtils";

type Props = {
  oid: string;
  hyvaksymisPaatosVaiheJulkaisu: HyvaksymisPaatosVaiheJulkaisu;
};

export default function HyvaksymisVaiheAineistotLukutila({ oid, hyvaksymisPaatosVaiheJulkaisu }: Props): ReactElement {
  const velhoURL = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-" + oid;
  return (
    <>
      <p className="vayla-label">Päätös ja sen liitteenä oleva aineisto</p>
      <p>
        Päätökset ja aineistot ovat olleet nähtävillä palvelun julkisella puolella {formatDate(hyvaksymisPaatosVaiheJulkaisu.kuulutusPaiva)}
        —{formatDate(hyvaksymisPaatosVaiheJulkaisu.kuulutusVaihePaattyyPaiva)} välisen ajan. Päätös löytyy asianhallinnasta ja liiteenä
        olevat aineistot <ExtLink href={velhoURL}>Projektivelhosta</ExtLink>.
      </p>
    </>
  );
}
