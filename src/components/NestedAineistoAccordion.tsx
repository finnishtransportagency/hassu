import HassuAccordion, { AccordionItem } from "@components/HassuAccordion";
import { experimental_sx as sx, Stack, styled } from "@mui/system";
import { AineistoKategoria, getNestedAineistoMaaraForCategory, kategorianAllaOlevienAineistojenMaara } from "common/aineistoKategoriat";
import { formatDateTime } from "common/util/dateUtils";
import useTranslation from "next-translate/useTranslation";
import { FunctionComponent, useMemo } from "react";
import HassuAineistoNimiExtLink from "./projekti/HassuAineistoNimiExtLink";
import { AineistoNew } from "@services/api";

interface NestedAineistoAccordionProps {
  aineisto: AineistoNew[];
  kategoriat: AineistoKategoria[];
  paakategoria?: boolean;
}

export const NestedAineistoAccordion: FunctionComponent<NestedAineistoAccordionProps> = ({ aineisto, kategoriat, paakategoria }) => {
  const { t } = useTranslation("aineisto");
  const accordionItems: AccordionItem[] = useMemo(
    () =>
      kategoriat
        .filter((kategoria) => {
          return aineisto && (paakategoria || kategorianAllaOlevienAineistojenMaara(aineisto, kategoria));
        })
        .map<AccordionItem>((kategoria) => ({
          id: kategoria.id,
          title: (
            <span className={paakategoria ? "vayla-small-title" : "vayla-smallest-title"}>
              {t(`aineisto-kategoria-nimi.${kategoria.id}`)}
              {" (" + getNestedAineistoMaaraForCategory(aineisto || [], kategoria) + ")"}
            </span>
          ),
          content: (
            <>
              {aineisto && (
                <Stack direction="column" rowGap={2}>
                  {aineisto
                    .filter((aineisto) => aineisto.kategoriaId === kategoria.id)
                    .map((aineisto) => (
                      <AineistoRow key={aineisto.dokumenttiOid}>
                        <HassuAineistoNimiExtLink tiedostoPolku={aineisto.tiedosto} aineistoNimi={aineisto.nimi} target="_blank" />
                        {!!aineisto.tuotu && <span>({formatDateTime(aineisto.lisatty)})</span>}
                      </AineistoRow>
                    ))}
                </Stack>
              )}
              {kategoria.alaKategoriat && <NestedAineistoAccordion aineisto={aineisto} kategoriat={kategoria.alaKategoriat} />}
            </>
          ),
        })),
    [kategoriat, aineisto, paakategoria, t]
  );
  return !!accordionItems.length ? <HassuAccordion items={accordionItems} /> : null;
};

const AineistoRow = styled("span")(sx({ display: "flex", gap: 3 }));
