import ExtLink from "@components/ExtLink";
import { KuulutusJulkaisuTila, TilasiirtymaTyyppi } from "@services/api";
import { isDateTimeInThePast } from "backend/src/util/dateUtil";
import { aineistoKategoriat } from "hassu-common/aineistoKategoriat";
import React, { useMemo } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import { formatDate } from "hassu-common/util/dateUtils";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { AineistoMuokkausSection } from "@components/projekti/lukutila/AineistoMuokkausSection";
import HyvaksyJaPalautaPainikkeet from "@components/projekti/HyvaksyJaPalautaPainikkeet";
import { AineistoNahtavillaAccordion } from "@components/projekti/AineistoNahtavillaAccordion";

export default function Lukunakyma() {
  const { data: projekti } = useProjekti();

  const julkaisu = useMemo(() => projekti?.nahtavillaoloVaiheJulkaisu, [projekti]);

  if (!projekti || !julkaisu) {
    return null;
  }

  const velhoURL = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-" + projekti.oid;

  const nahtavillaoloMenneisyydessa =
    !!julkaisu.kuulutusVaihePaattyyPaiva && isDateTimeInThePast(julkaisu.kuulutusVaihePaattyyPaiva, "end-of-day");

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  const voiHyvaksya =
    julkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA &&
    projekti?.nykyinenKayttaja.onProjektipaallikkoTaiVarahenkilo &&
    julkaisu.aineistoMuokkaus;

  return (
    <>
      <AineistoMuokkausSection julkaisu={julkaisu} tyyppi={TilasiirtymaTyyppi.NAHTAVILLAOLO} projekti={projekti} gap={4}>
        <h4 className="vayla-smallest-title">Nähtäville asetettu aineisto</h4>
        {nahtavillaoloMenneisyydessa ? (
          <p>
            Aineistot ovat olleet nähtävillä palvelun julkisella puolella {formatDate(julkaisu.kuulutusPaiva)}—
            {formatDate(julkaisu.kuulutusVaihePaattyyPaiva)} välisen ajan. Nähtävilleasetetut aineistot löytyvät
            <ExtLink href={velhoURL}>Projektivelhosta</ExtLink>.
          </p>
        ) : (
          <p>
            Aineistot ovat nähtävillä palvelun julkisella puolella
            {" " + formatDate(julkaisu.kuulutusVaihePaattyyPaiva) + " "}
            saakka.
          </p>
        )}
        {!epaaktiivinen && (
          <AineistoNahtavillaAccordion kategoriat={aineistoKategoriat.listKategoriat()} julkaisu={julkaisu} paakategoria />
        )}
      </AineistoMuokkausSection>
      {!epaaktiivinen && voiHyvaksya && (
        <HyvaksyJaPalautaPainikkeet julkaisu={julkaisu} projekti={projekti} tilasiirtymaTyyppi={TilasiirtymaTyyppi.NAHTAVILLAOLO} />
      )}
    </>
  );
}
