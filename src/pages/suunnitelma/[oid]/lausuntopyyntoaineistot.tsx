import React, { FunctionComponent, ReactElement, useMemo } from "react";
import Section from "@components/layout/Section";
import { useLisaAineisto } from "src/hooks/useLisaAineisto";
import HassuAccordion, { AccordionItem } from "@components/HassuAccordion";
import { AineistoKategoria, aineistoKategoriat, getNestedAineistoMaaraForCategory } from "hassu-common/aineistoKategoriat";
import useTranslation from "next-translate/useTranslation";
import { Aineisto, LadattavaTiedosto, LadattavatTiedostot } from "@services/api";
import { Stack } from "@mui/material";
import ExtLink from "@components/ExtLink";
import { formatDate } from "hassu-common/util/dateUtils";
import DownloadIcon from "@mui/icons-material/Download";
import ButtonLink from "@components/button/ButtonLink";

export default function Lausuntopyyntoaineistot(): ReactElement {
  const data: null | undefined | LadattavatTiedostot = useLisaAineisto().data;
  let poistumisPaiva = data?.poistumisPaiva;
  if (!poistumisPaiva) {
    return <></>;
  }
  return (
    <>
      <Section>
        <p>Huomioi, että tämä sisältö on tarkasteltavissa {formatDate(poistumisPaiva)} asti, jonka jälkeen sisältö poistuu näkyvistä.</p>
        <AineistoNahtavillaAccordion
          kategoriat={[...aineistoKategoriat.listKategoriat(), new AineistoKategoria({ id: "lisaAineisto" })]}
          data={data}
        />
      </Section>
      {data?.aineistopaketti && (
        <Section noDivider>
          <ButtonLink href={data.aineistopaketti}>
            Lataa kaikki
            <DownloadIcon className="ml-2" />
          </ButtonLink>
        </Section>
      )}
    </>
  );
}

interface AineistoNahtavillaAccordionProps {
  kategoriat: AineistoKategoria[];
  data?: null | LadattavatTiedostot;
}

const AineistoNahtavillaAccordion: FunctionComponent<AineistoNahtavillaAccordionProps> = (props) => {
  const { t } = useTranslation("aineisto");
  const data = props.data;
  const aineistot: LadattavaTiedosto[] = useMemo(
    () => [
      ...(data?.aineistot || []),
      ...(data?.lisaAineistot?.map<LadattavaTiedosto>((aineisto) => ({ ...aineisto, kategoriaId: "lisaAineisto" })) || []),
    ],
    [data]
  );

  const accordionItems: AccordionItem[] = useMemo(
    () =>
      props.kategoriat
        .filter((kategoria) =>
          aineistot?.some(
            (aineisto) =>
              aineisto.kategoriaId === kategoria.id ||
              (aineisto.kategoriaId &&
                kategoria.alaKategoriat?.map((kategoria: AineistoKategoria) => kategoria.id)?.includes(aineisto.kategoriaId))
          )
        )
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
                          className="file_download"
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
              {kategoria.alaKategoriat && <AineistoNahtavillaAccordion kategoriat={kategoria.alaKategoriat} data={data} />}
            </>
          ),
        })),
    [t, props.kategoriat, aineistot, data]
  );

  return (
    <>
      <HassuAccordion items={accordionItems} />
    </>
  );
};
