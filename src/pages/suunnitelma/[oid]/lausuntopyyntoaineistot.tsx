import React, { FC, ReactElement, useMemo } from "react";
import Section from "@components/layout/Section";
import { useLisaAineisto } from "src/hooks/useLisaAineisto";
import HassuAccordion, { AccordionItem } from "@components/HassuAccordion";
import { AineistoKategoria, aineistoKategoriat, getNestedAineistoMaaraForCategory } from "common/aineistoKategoriat";
import useTranslation from "next-translate/useTranslation";
import { Aineisto, LisaAineisto } from "@services/api";
import { Stack } from "@mui/material";
import ExtLink from "@components/ExtLink";

export default function Lausuntopyyntoaineistot(): ReactElement {
  return (
    <Section>
      <p>Huomioi, että tämä sisältö on tarkasteltavissa DD.MM.YYYY asti, jonka jälkeen sisältö poistuu näkyvistä.</p>
      <AineistoNahtavillaAccordion
        kategoriat={[...aineistoKategoriat.listKategoriat(), new AineistoKategoria({ id: "lisaAineisto" })]}
      />
    </Section>
  );
}

interface AineistoNahtavillaAccordionProps {
  kategoriat: AineistoKategoria[];
}

const AineistoNahtavillaAccordion: FC<AineistoNahtavillaAccordionProps> = (props) => {
  const { t } = useTranslation("aineisto");
  const { data } = useLisaAineisto();

  const aineistot: LisaAineisto[] = useMemo(
    () => [
      ...(data?.aineistot || []),
      ...(data?.lisaAineistot?.map<LisaAineisto>((aineisto) => ({ ...aineisto, kategoriaId: "lisaAineisto" })) || []),
    ],
    [data]
  );

  const accordionItems: AccordionItem[] = useMemo(
    () =>
      props.kategoriat
        .filter((kategoria) => aineistot?.some((aineisto) => aineisto.kategoriaId === kategoria.id))
        .map<AccordionItem>((kategoria) => ({
          id: kategoria.id,
          title: (
            <span>
              {t(kategoria.id === "lisaAineisto" ? "lisa-aineisto" : `aineisto-kategoria-nimi.${kategoria.id}`)}
              {" (" + getNestedAineistoMaaraForCategory((aineistot as unknown as Aineisto[]) || [], kategoria) + ")"}
            </span>
          ),
          content: (
            <>
              {aineistot && (
                <Stack direction="column" rowGap={2}>
                  {aineistot
                    .filter((aineisto) => aineisto.kategoriaId === kategoria.id)
                    .map((aineisto, index) => (
                      <span key={index}>
                        <ExtLink
                          href={aineisto?.linkki ? aineisto?.linkki : undefined}
                          disabled={!aineisto?.linkki}
                          sx={{ mr: 3 }}
                        >
                          {aineisto.nimi}
                        </ExtLink>
                      </span>
                    ))}
                </Stack>
              )}
              {kategoria.alaKategoriat && <AineistoNahtavillaAccordion kategoriat={kategoria.alaKategoriat} />}
            </>
          ),
        })),
    [t, props.kategoriat, aineistot]
  );

  return (
    <>
      <HassuAccordion items={accordionItems} />
    </>
  );
};
