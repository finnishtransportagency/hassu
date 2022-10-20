import ExtLink from "@components/ExtLink";
import { NahtavillaoloVaiheJulkaisu } from "common/graphql/apiModel";
import { ReactElement } from "react";
import { formatDate } from "src/util/dateUtils";

type Props = {
  nahtavillaoloVaiheJulkaisu: NahtavillaoloVaiheJulkaisu;
  oid: string;
};

export default function NahtavillaoloAineistotLukutila({ oid, nahtavillaoloVaiheJulkaisu }: Props): ReactElement {
  const velhoURL = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-" + oid;
  return (
    <>
      <p className="vayla-label">Nähtäville asetettu aineisto</p>
      <p>
        Aineistot ovat olleet nähtävillä palvelun julkisella puolella {formatDate(nahtavillaoloVaiheJulkaisu.kuulutusPaiva)}—
        {formatDate(nahtavillaoloVaiheJulkaisu.kuulutusVaihePaattyyPaiva)} välisen ajan. Nähtävilleasetetut aineistot löytyvät
        <ExtLink href={velhoURL}>Projektivelhosta</ExtLink>.
      </p>
    </>
  );
}
