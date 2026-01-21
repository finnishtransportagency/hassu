import ExtLink from "@components/ExtLink";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import { Stack } from "@mui/material";
import { KuulutusJulkaisuTila } from "@services/api";
import { isDateTimeInThePast } from "backend/src/util/dateUtil";
import { getAineistoKategoriat } from "hassu-common/aineistoKategoriat";
import React, { useMemo } from "react";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { formatDate, formatDateTime } from "hassu-common/util/dateUtils";
import { paatosSpecificTilasiirtymaTyyppiMap } from "src/util/getPaatosSpecificData";
import { getPaatosSpecificData, PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { AineistoMuokkausSection } from "@components/projekti/lukutila/AineistoMuokkausSection";
import HyvaksyJaPalautaPainikkeet from "@components/projekti/HyvaksyJaPalautaPainikkeet";
import { AineistoNahtavillaAccordion } from "@components/projekti/AineistoNahtavillaAccordion";
import { getVelhoUrl } from "../../../../util/velhoUtils";
import { H2, H3 } from "../../../Headings";

interface Props {
  projekti: ProjektiLisatiedolla;
  paatosTyyppi: PaatosTyyppi;
}

export default function Lukunakyma({ projekti, paatosTyyppi }: Readonly<Props>) {
  const { julkaisu } = useMemo(() => getPaatosSpecificData(projekti, paatosTyyppi), [paatosTyyppi, projekti]);

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  const paatosJulkaisuMenneisyydessa =
    julkaisu?.kuulutusVaihePaattyyPaiva && isDateTimeInThePast(julkaisu.kuulutusVaihePaattyyPaiva, "end-of-day");

  const kategoriat = useMemo(
    () => getAineistoKategoriat({ projektiTyyppi: projekti.velho.tyyppi }).listKategoriat(),
    [projekti.velho.tyyppi]
  );

  if (!projekti || !julkaisu) {
    return null;
  }
  const velhoURL = getVelhoUrl(projekti.oid);

  const voiHyvaksya =
    julkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA &&
    projekti?.nykyinenKayttaja.onProjektipaallikkoTaiVarahenkilo &&
    julkaisu.aineistoMuokkaus;

  const jatkopaatosvaiheessa = projekti.jatkoPaatos1Vaihe;

  return (
    <>
      <AineistoMuokkausSection projekti={projekti} julkaisu={julkaisu} tyyppi={paatosSpecificTilasiirtymaTyyppiMap[paatosTyyppi]} gap={4}>
        <H2>Päätös ja sen liitteenä oleva aineisto</H2>
        {paatosJulkaisuMenneisyydessa ? (
          <p>
            Aineistot ovat olleet nähtävillä palvelun julkisella puolella {formatDate(julkaisu.kuulutusPaiva)}—
            {formatDate(julkaisu.kuulutusVaihePaattyyPaiva)} välisen ajan. Nähtävilleasetetut aineistot löytyvät{" "}
            <ExtLink style={{ marginLeft: "5px" }} href={velhoURL}>
              Projektivelhosta
            </ExtLink>
            .
          </p>
        ) : (
          <p>
            Aineistot ovat nähtävillä palvelun julkisella puolella
            {" " + formatDate(julkaisu.kuulutusVaihePaattyyPaiva) + " "}
            saakka.
          </p>
        )}
        {!epaaktiivinen && (
          <>
            <H3>Päätös</H3>
            {julkaisu?.hyvaksymisPaatos && (
              <Stack direction="column" rowGap={2}>
                {julkaisu.hyvaksymisPaatos.map((aineisto) => (
                  <span key={aineisto.dokumenttiOid}>
                    <HassuAineistoNimiExtLink
                      tiedostoPolku={aineisto.tiedosto}
                      aineistoNimi={aineisto.nimi}
                      aineistoTila={aineisto.tila}
                      sx={{ mr: 3 }}
                      target="_blank"
                    />
                    {aineisto.tuotu && formatDateTime(aineisto.tuotu)}
                  </span>
                ))}
              </Stack>
            )}
            <H3 className="mt-8">Päätöksen liitteenä oleva aineisto</H3>
            <AineistoNahtavillaAccordion kategoriat={kategoriat} julkaisu={julkaisu} paakategoria />
          </>
        )}
        {jatkopaatosvaiheessa && (
          <>
            <H3>Alkuperäinen hyväksymispäätös ja liittyvät aineistot</H3>
            {julkaisu?.alkuperainenPaatos && (
              <Stack direction="column" rowGap={2}>
                {julkaisu.alkuperainenPaatos.map((aineisto) => (
                  <span key={aineisto.dokumenttiOid}>
                    <HassuAineistoNimiExtLink
                      tiedostoPolku={aineisto.tiedosto}
                      aineistoNimi={aineisto.nimi}
                      aineistoTila={aineisto.tila}
                      sx={{ mr: 3 }}
                      target="_blank"
                    />
                    {aineisto.tuotu && formatDateTime(aineisto.tuotu)}
                  </span>
                ))}
              </Stack>
            )}
          </>
        )}
      </AineistoMuokkausSection>
      {!epaaktiivinen && voiHyvaksya && (
        <HyvaksyJaPalautaPainikkeet
          julkaisu={julkaisu}
          projekti={projekti}
          tilasiirtymaTyyppi={paatosSpecificTilasiirtymaTyyppiMap[paatosTyyppi]}
        />
      )}
    </>
  );
}
