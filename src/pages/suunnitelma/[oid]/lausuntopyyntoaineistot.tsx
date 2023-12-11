import React, { FunctionComponent, ReactElement, useMemo } from "react";
import Section from "@components/layout/Section";
import { useLisaAineisto } from "src/hooks/useLisaAineisto";
import HassuAccordion, { AccordionItem } from "@components/HassuAccordion";
import { AineistoKategoria, aineistoKategoriat, getNestedAineistoMaaraForCategory } from "hassu-common/aineistoKategoriat";
import useTranslation from "next-translate/useTranslation";
import { Aineisto, LadattavaTiedosto, LadattavatTiedostot } from "@services/api";
import { Stack } from "@mui/material";
import { formatDate } from "hassu-common/util/dateUtils";
import DownloadIcon from "@mui/icons-material/Download";
import ButtonLink from "@components/button/ButtonLink";
import SectionContent from "@components/layout/SectionContent";
import { renderLadattavaTiedosto } from "@components/projekti/lausuntopyynnot/renderLadattavaTiedosto";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import VanhentunutAineistolinkki from "@components/projekti/lausuntopyynnot/VanhentunutAineistolinkki";

export default function Lausuntopyyntoaineistot(): ReactElement {
  const data: null | undefined | LadattavatTiedostot = useLisaAineisto().data;
  const { data: projekti } = useProjektiJulkinen();
  let poistumisPaiva = data?.poistumisPaiva;
  if (!(poistumisPaiva && data && projekti)) {
    return <></>;
  }
  const { lisaAineistot, ...restOfAineistot } = data;

  if (data.linkkiVanhentunut) {
    return <VanhentunutAineistolinkki projekti={projekti} data={data} />;
  }

  return (
    <>
      <h1 className="vayla-header">Lausuntopyynnön aineisto</h1>
      <h2 className="mt-8 mb-8">{projekti?.velho.nimi}</h2>
      <p>
        Huomioi, että tämä sisältö on tarkasteltavissa <b>{formatDate(poistumisPaiva)}</b> asti, jonka jälkeen sisältö poistuu näkyvistä.
      </p>
      <Section>
        {restOfAineistot?.aineistot?.length && <h2 className="vayla-title">Suunnitelma</h2>}
        <AineistoNahtavillaAccordion kategoriat={[...aineistoKategoriat.listKategoriat()]} data={restOfAineistot} />
        {!!lisaAineistot?.length && (
          <SectionContent>
            <h2 className="vayla-title">Lisäaineistot</h2>
            <ul style={{ listStyle: "none" }}>
              {lisaAineistot.map((tiedosto, index) => (
                <li key={index}>{renderLadattavaTiedosto(tiedosto)}</li>
              ))}
            </ul>
          </SectionContent>
        )}
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
            <h3 className="vayla-subtitle m-0">
              {t(kategoria.id === "lisaAineisto" ? "lisa-aineisto" : `aineisto-kategoria-nimi.${kategoria.id}`)}
              {" (" + getNestedAineistoMaaraForCategory((aineistot as unknown as Aineisto[]) || [], kategoria) + ")"}
            </h3>
          ),
          content: (
            <>
              {aineistot && (
                <Stack direction="column" rowGap={2}>
                  {aineistot
                    .filter((aineisto) => aineisto.kategoriaId === kategoria.id)
                    .map((aineisto, index) => (
                      <span key={index}>{renderLadattavaTiedosto(aineisto)}</span>
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
