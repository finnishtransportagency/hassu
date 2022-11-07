import HassuAccordion, { AccordionItem } from "@components/HassuAccordion";
import Section from "@components/layout/Section";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import { Stack } from "@mui/material";
import { HyvaksymisPaatosVaiheJulkaisu, HyvaksymisPaatosVaiheTila } from "@services/api";
import { AineistoKategoria, aineistoKategoriat, getNestedAineistoMaaraForCategory } from "common/aineistoKategoriat";
import useTranslation from "next-translate/useTranslation";
import React, { FC, useMemo } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import { formatDate, formatDateTime } from "src/util/dateUtils";
import { examineJulkaisuPaiva } from "../../../../util/dateUtils";

export default function Lukunakyma() {
  const { data: projekti } = useProjekti();

  const julkaisu = useMemo(
    () => projekti?.hyvaksymisPaatosVaiheJulkaisut?.[projekti.hyvaksymisPaatosVaiheJulkaisut.length - 1],
    [projekti]
  );

  const { published } = examineJulkaisuPaiva(
    julkaisu?.tila === HyvaksymisPaatosVaiheTila.HYVAKSYTTY,
    julkaisu?.kuulutusPaiva
  );

  if (!projekti || !julkaisu) {
    return null;
  }

  return (
    <>
      <Section smallGaps>
        <h4 className="vayla-smallest-title">Päätös ja sen liitteenä oleva aineisto</h4>
        {published && (
          <p>
            Aineistot ovat nähtävillä palvelun julkisella puolella
            {" " + formatDate(julkaisu.kuulutusVaihePaattyyPaiva) + " "}
            saakka.
          </p>
        )}
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
      </Section>
    </>
  );
}

interface AineistoNahtavillaAccordionProps {
  julkaisu: HyvaksymisPaatosVaiheJulkaisu;
  kategoriat: AineistoKategoria[];
}

const AineistoNahtavillaAccordion: FC<AineistoNahtavillaAccordionProps> = ({ julkaisu, kategoriat }) => {
  const { t } = useTranslation("aineisto");
  const accordionItems: AccordionItem[] = useMemo(
    () =>
      kategoriat
        .filter((kategoria) => julkaisu.aineistoNahtavilla?.some((aineisto) => aineisto.kategoriaId === kategoria.id))
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
              {kategoria.alaKategoriat && (
                <AineistoNahtavillaAccordion julkaisu={julkaisu} kategoriat={kategoria.alaKategoriat} />
              )}
            </>
          ),
        })),
    [t, julkaisu, kategoriat]
  );
  return !!accordionItems.length ? <HassuAccordion items={accordionItems} /> : null;
};
