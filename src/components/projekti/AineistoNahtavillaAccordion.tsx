import HassuAccordion, { AccordionItem } from "@components/HassuAccordion";
import { experimental_sx as sx, Stack, styled } from "@mui/system";
import { NahtavillaoloVaiheJulkaisu } from "@services/api";
import { AineistoKategoria, getNestedAineistoMaaraForCategory, kategorianAllaOlevienAineistojenMaara } from "common/aineistoKategoriat";
import { formatDateTime } from "common/util/dateUtils";
import dayjs from "dayjs";
import useTranslation from "next-translate/useTranslation";
import { FunctionComponent, useMemo } from "react";
import HassuAineistoNimiExtLink from "./HassuAineistoNimiExtLink";
import { UusiSpan } from "./UusiSpan";

interface AineistoNahtavillaAccordionProps {
  julkaisu: Pick<NahtavillaoloVaiheJulkaisu, "aineistoNahtavilla" | "aineistoMuokkaus">;
  kategoriat: AineistoKategoria[];
  paakategoria?: boolean;
}

export const AineistoNahtavillaAccordion: FunctionComponent<AineistoNahtavillaAccordionProps> = ({
  julkaisu,
  kategoriat,
  paakategoria,
}) => {
  const { t } = useTranslation("aineisto");
  const accordionItems: AccordionItem[] = useMemo(
    () =>
      kategoriat
        .filter((kategoria) => {
          return (
            julkaisu.aineistoNahtavilla && (paakategoria || kategorianAllaOlevienAineistojenMaara(julkaisu.aineistoNahtavilla, kategoria))
          );
        })
        .map<AccordionItem>((kategoria) => ({
          id: kategoria.id,
          title: (
            <span>
              {t(`aineisto-kategoria-nimi.${kategoria.id}`)}
              {" (" + getNestedAineistoMaaraForCategory(julkaisu.aineistoNahtavilla ?? [], kategoria) + ")"}
            </span>
          ),
          content: (
            <>
              {julkaisu.aineistoNahtavilla && (
                <Stack direction="column" rowGap={2}>
                  {julkaisu.aineistoNahtavilla
                    .filter((aineisto) => aineisto.kategoriaId === kategoria.id)
                    .map((aineisto) => (
                      <AineistoRow key={aineisto.dokumenttiOid}>
                        <HassuAineistoNimiExtLink
                          tiedostoPolku={aineisto.tiedosto}
                          aineistoNimi={aineisto.nimi}
                          aineistoTila={aineisto.tila}
                          target="_blank"
                        />
                        {!!aineisto.tuotu && <span>({formatDateTime(aineisto.tuotu)})</span>}
                        {!!aineisto.tuotu &&
                          !!julkaisu.aineistoMuokkaus?.alkuperainenHyvaksymisPaiva &&
                          dayjs(aineisto.tuotu).isAfter(julkaisu.aineistoMuokkaus?.alkuperainenHyvaksymisPaiva) && <UusiSpan />}
                      </AineistoRow>
                    ))}
                </Stack>
              )}
              {kategoria.alaKategoriat && <AineistoNahtavillaAccordion julkaisu={julkaisu} kategoriat={kategoria.alaKategoriat} />}
            </>
          ),
        })),
    [kategoriat, julkaisu, paakategoria, t]
  );
  return accordionItems.length ? <HassuAccordion items={accordionItems} /> : null;
};

const AineistoRow = styled("span")(sx({ display: "flex", gap: 3 }));
