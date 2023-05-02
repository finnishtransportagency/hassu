import ExtLink from "@components/ExtLink";
import HassuAccordion, { AccordionItem } from "@components/HassuAccordion";
import Section from "@components/layout/Section";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import { Stack } from "@mui/material";
import { HyvaksymisPaatosVaiheJulkaisu } from "@services/api";
import { isDateTimeInThePast } from "backend/src/util/dateUtil";
import {
  AineistoKategoria,
  aineistoKategoriat,
  getNestedAineistoMaaraForCategory,
  kategorianAllaOlevienAineistojenMaara,
} from "common/aineistoKategoriat";
import useTranslation from "next-translate/useTranslation";
import React, { FunctionComponent, useMemo } from "react";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { formatDate, formatDateTime } from "common/util/dateUtils";
import { getPaatosSpecificData, PaatosTyyppi } from "src/util/getPaatosSpecificData";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";

interface Props {
  projekti: ProjektiLisatiedolla;
  paatosTyyppi: PaatosTyyppi;
}

export default function Lukunakyma({ projekti, paatosTyyppi }: Props) {
  const { julkaisu } = useMemo(() => getPaatosSpecificData(projekti, paatosTyyppi), [paatosTyyppi, projekti]);

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  const paatosJulkaisuMenneisyydessa =
    julkaisu?.kuulutusVaihePaattyyPaiva && isDateTimeInThePast(julkaisu.kuulutusVaihePaattyyPaiva, "end-of-day");

  if (!projekti || !julkaisu) {
    return null;
  }
  const velhoURL = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-" + projekti.oid;

  return (
    <>
      <Section smallGaps>
        <h4 className="vayla-smallest-title">Päätös ja sen liitteenä oleva aineisto</h4>
        {paatosJulkaisuMenneisyydessa ? (
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
          <>
            <p>Päätös</p>
            {julkaisu && julkaisu.hyvaksymisPaatos && (
              <Stack direction="column" rowGap={2}>
                {julkaisu.hyvaksymisPaatos.map((aineisto) => (
                  <span key={aineisto.dokumenttiOid}>
                    <HassuAineistoNimiExtLink
                      tiedostoPolku={aineisto.tiedosto}
                      aineistoNimi={aineisto.nimi}
                      sx={{ mr: 3 }}
                      target="_blank"
                    />
                    {aineisto.tuotu && formatDateTime(aineisto.tuotu)}
                  </span>
                ))}
              </Stack>
            )}
            <p className="mt-8">Päätöksen liitteenä oleva aineisto</p>
            <AineistoNahtavillaAccordion
              kategoriat={aineistoKategoriat.listKategoriat()}
              julkaisu={julkaisu as HyvaksymisPaatosVaiheJulkaisu}
            />
          </>
        )}
      </Section>
    </>
  );
}

interface AineistoNahtavillaAccordionProps {
  julkaisu: HyvaksymisPaatosVaiheJulkaisu;
  kategoriat: AineistoKategoria[];
}

const AineistoNahtavillaAccordion: FunctionComponent<AineistoNahtavillaAccordionProps> = ({ julkaisu, kategoriat }) => {
  const { t } = useTranslation("aineisto");
  const accordionItems: AccordionItem[] = useMemo(
    () =>
      kategoriat
        .filter((kategoria) => julkaisu.aineistoNahtavilla && kategorianAllaOlevienAineistojenMaara(julkaisu.aineistoNahtavilla, kategoria))
        .map<AccordionItem>((kategoria) => ({
          id: kategoria.id,
          title: (
            <span>
              {t(`aineisto-kategoria-nimi.${kategoria.id}`)}
              {" (" + getNestedAineistoMaaraForCategory(julkaisu.aineistoNahtavilla || [], kategoria) + ")"}
            </span>
          ),
          content: (
            <>
              {julkaisu.aineistoNahtavilla && (
                <Stack direction="column" rowGap={2}>
                  {julkaisu.aineistoNahtavilla
                    .filter((aineisto) => aineisto.kategoriaId === kategoria.id)
                    .map((aineisto) => (
                      <span key={aineisto.dokumenttiOid}>
                        <HassuAineistoNimiExtLink
                          tiedostoPolku={aineisto.tiedosto}
                          aineistoNimi={aineisto.nimi}
                          sx={{ mr: 3 }}
                          target="_blank"
                        />
                        {aineisto.tuotu && formatDateTime(aineisto.tuotu)}
                      </span>
                    ))}
                </Stack>
              )}
              {kategoria.alaKategoriat && <AineistoNahtavillaAccordion julkaisu={julkaisu} kategoriat={kategoria.alaKategoriat} />}
            </>
          ),
        })),
    [t, julkaisu, kategoriat]
  );
  return !!accordionItems.length ? <HassuAccordion items={accordionItems} /> : null;
};
