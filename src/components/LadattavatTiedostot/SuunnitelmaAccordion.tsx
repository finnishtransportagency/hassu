import HassuAccordion, { AccordionItem } from "@components/HassuAccordion";
import { Stack } from "@mui/material";
import { LadattavaTiedosto } from "@services/api";
import { AineistoKategoria, getNestedAineistoMaaraForCategory } from "common/aineistoKategoriat";
import useTranslation from "next-translate/useTranslation";
import { FunctionComponent, useMemo } from "react";
import LadattavaTiedostoComponent from "./LadattavaTiedosto";
import { H3, H4 } from "@components/Headings";

interface AineistoNahtavillaAccordionProps {
  kategoriat: AineistoKategoria[];
  aineistot: LadattavaTiedosto[] | null | undefined;
  esikatselu: boolean;
}

const SuunnittelmaLadattavatTiedostotAccordion: FunctionComponent<AineistoNahtavillaAccordionProps> = ({
  aineistot,
  kategoriat,
  esikatselu,
}) => {
  const { t } = useTranslation("aineisto");

  const accordionItems: AccordionItem[] = useMemo(
    () =>
      kategoriat
        .filter((kategoria) =>
          aineistot?.some(
            (aineisto) =>
              aineisto.kategoriaId === kategoria.id ||
              (aineisto.kategoriaId &&
                kategoria.alaKategoriat?.map((kategoria: AineistoKategoria) => kategoria.id)?.includes(aineisto.kategoriaId))
          )
        )
        .map((kategoria) => ({ kategoria, Heading: kategoria.alaKategoriat ? H3 : H4 }))
        .map<AccordionItem>(({ kategoria, Heading }) => ({
          id: kategoria.id,
          title: (
            <Heading sx={{ margin: 0 }}>
              {t(`aineisto-kategoria-nimi.${kategoria.id}`)}
              {" (" + getNestedAineistoMaaraForCategory(aineistot, kategoria) + ")"}
            </Heading>
          ),
          content: (
            <>
              {aineistot && (
                <Stack direction="column" rowGap={2}>
                  {aineistot
                    .filter((aineisto) => aineisto.kategoriaId === kategoria.id)
                    .map((aineisto, index) => (
                      <span key={index}>
                        <LadattavaTiedostoComponent tiedosto={aineisto} esikatselu={esikatselu} />
                      </span>
                    ))}
                </Stack>
              )}
              {kategoria.alaKategoriat && (
                <SuunnittelmaLadattavatTiedostotAccordion
                  kategoriat={kategoria.alaKategoriat}
                  aineistot={aineistot}
                  esikatselu={esikatselu}
                />
              )}
            </>
          ),
        })),
    [kategoriat, aineistot, t, esikatselu]
  );

  return <HassuAccordion items={accordionItems} />;
};

export default SuunnittelmaLadattavatTiedostotAccordion;
