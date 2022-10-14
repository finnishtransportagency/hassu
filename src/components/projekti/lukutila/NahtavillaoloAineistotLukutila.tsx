import { NahtavillaoloVaiheJulkaisu } from "common/graphql/apiModel";
import { ReactElement } from "react";
import { formatDate } from "src/util/dateUtils";

type Props = {
  nahtavillaoloVaiheJulkaisu: NahtavillaoloVaiheJulkaisu;
};

export default function NahtavillaoloAineistotLukutila({ nahtavillaoloVaiheJulkaisu }: Props): ReactElement {
  return (
    <>
      <p className="vayla-label">Nähtäville asetettu aineisto</p>
      <p>
        Aineistot ovat olleet nähtävillä palvelun julkisella puolella {formatDate(nahtavillaoloVaiheJulkaisu.kuulutusPaiva)}—
        {formatDate(nahtavillaoloVaiheJulkaisu.kuulutusVaihePaattyyPaiva)} välisen ajan. Nähtävilleasetetut aineistot löytyvät
        Projektivelhosta.
      </p>
    </>
  );
}
