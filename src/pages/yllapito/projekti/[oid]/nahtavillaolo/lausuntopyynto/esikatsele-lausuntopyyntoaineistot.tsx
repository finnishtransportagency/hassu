import React, { FunctionComponent, ReactElement, useMemo } from "react";
import Section from "@components/layout/Section";
import HassuAccordion, { AccordionItem } from "@components/HassuAccordion";
import { AineistoKategoria, aineistoKategoriat, getNestedAineistoMaaraForCategory } from "hassu-common/aineistoKategoriat";
import useTranslation from "next-translate/useTranslation";
import { Aineisto, LadattavaTiedosto, LadattavatTiedostot } from "@services/api";
import { Stack } from "@mui/material";
import { formatDate } from "hassu-common/util/dateUtils";
import DownloadIcon from "@mui/icons-material/Download";
import ButtonLink from "@components/button/ButtonLink";
import SectionContent from "@components/layout/SectionContent";
import { useEsikatseleLausuntoPyynnonAineistot } from "src/hooks/useEsikatseleLausuntoPyynnonAineistot";
import Notification, { NotificationType } from "@components/notification/Notification";
import LadattavaTiedostoComponent from "@components/projekti/lausuntopyynnot/LadattavaTiedosto";
import { useProjekti } from "src/hooks/useProjekti";
import { PreviewExpiredError } from "common/error/PreviewExpiredError";

export default function EsikatseleLausuntopyynnonAineistot(): ReactElement {
  const data: null | undefined | LadattavatTiedostot | PreviewExpiredError = useEsikatseleLausuntoPyynnonAineistot().data;
  const { data: projekti } = useProjekti();

  if (data instanceof PreviewExpiredError) {
    return <>Tarvittu data esikatselua varten on unohtunut. Sulje välilehti ja avaa esikatselu uudestaan.</>;
  }

  if (!data) {
    return <></>;
  }

  let poistumisPaiva = data?.poistumisPaiva;
  const { lisaAineistot, ...restOfAineistot } = data;

  return (
    <>
      <h1 className="vayla-header">Lausuntopyynnön aineisto (esikatselu)</h1>
      <h2 className="mt-8 mb-8">{projekti?.velho.nimi}</h2>
      <p>
        Huomioi, että tämä sisältö on tarkasteltavissa <b>{formatDate(poistumisPaiva)}</b> asti, jonka jälkeen sisältö poistuu näkyvistä.
      </p>
      <Section>
        <Notification type={NotificationType.INFO_GRAY}>
          Esikatselutilassa voit nähdä, miltä linkin sisältö näyttää vastaanottajille. Varsinaisessa linkissä voi avata aineistoja uuteen
          välilehteen yksi kerrallaan tai ladata ne kaikki kerallaan omalle koneellesi.
        </Notification>
        {restOfAineistot?.aineistot?.length && <h2 className="vayla-title">Suunnitelma</h2>}
        <AineistoNahtavillaEsikatseluAccordion kategoriat={[...aineistoKategoriat.listKategoriat()]} data={restOfAineistot} />
        {!!lisaAineistot?.length && (
          <SectionContent>
            <h2 className="vayla-title">Lausuntopyyntöön liitetty lisäaineisto</h2>
            <ul style={{ listStyle: "none" }}>
              {lisaAineistot.map((tiedosto, index) => {
                return (
                  <li key={index}>
                    <LadattavaTiedostoComponent tiedosto={tiedosto} esikatselu />
                  </li>
                );
              })}
            </ul>
          </SectionContent>
        )}
      </Section>
      {data?.aineistopaketti && (
        <Section noDivider>
          <ButtonLink disabled={true}>
            Lataa kaikki
            <DownloadIcon className="ml-2" />
          </ButtonLink>
        </Section>
      )}
    </>
  );
}

interface AineistoNahtavillaEsikatseluAccordionProps {
  kategoriat: AineistoKategoria[];
  data?: null | LadattavatTiedostot;
}

const AineistoNahtavillaEsikatseluAccordion: FunctionComponent<AineistoNahtavillaEsikatseluAccordionProps> = (props) => {
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
            <h3 className="vayla-small-title m-0">
              {t(`aineisto-kategoria-nimi.${kategoria.id}`)}
              {" (" + getNestedAineistoMaaraForCategory((aineistot as unknown as Aineisto[]) || [], kategoria) + ")"}
            </h3>
          ),
          content: (
            <>
              {aineistot && (
                <Stack direction="column" rowGap={2}>
                  {aineistot
                    .filter((aineisto) => aineisto.kategoriaId === kategoria.id)
                    .map((aineisto, index) => {
                      return (
                        <span key={index}>
                          <LadattavaTiedostoComponent tiedosto={aineisto} esikatselu />
                        </span>
                      );
                    })}
                </Stack>
              )}
              {kategoria.alaKategoriat && <AineistoNahtavillaEsikatseluAccordion kategoriat={kategoria.alaKategoriat} data={data} />}
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
