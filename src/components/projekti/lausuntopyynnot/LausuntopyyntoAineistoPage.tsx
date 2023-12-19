import React, { FunctionComponent, ReactElement, useMemo } from "react";
import Section from "@components/layout/Section2";
import HassuAccordion, { AccordionItem } from "@components/HassuAccordion";
import { AineistoKategoria, aineistoKategoriat, getNestedAineistoMaaraForCategory } from "hassu-common/aineistoKategoriat";
import useTranslation from "next-translate/useTranslation";
import { LadattavaTiedosto, ProjektiJulkinen } from "@services/api";
import { Stack } from "@mui/material";
import { formatDate } from "hassu-common/util/dateUtils";
import DownloadIcon from "@mui/icons-material/Download";
import ButtonLink from "@components/button/ButtonLink";
import ContentSpacer from "@components/layout/ContentSpacer";
import LadattavaTiedostoComponent from "@components/projekti/lausuntopyynnot/LadattavaTiedosto";
import { H1, H2, H3, H4 } from "@components/Headings";
import Notification, { NotificationType } from "@components/notification/Notification";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";

type Props = {
  esikatselu?: boolean;
  lisaAineistot: LadattavaTiedosto[] | null | undefined;
  aineistopaketti: string | null | undefined;
  aineistot: LadattavaTiedosto[] | null | undefined;
  poistumisPaiva: string | undefined;
  projekti: ProjektiJulkinen | ProjektiLisatiedolla | null | undefined;
};

export default function LausuntopyyntoAineistoPage(props: Props): ReactElement {
  const { lisaAineistot, aineistopaketti, aineistot, poistumisPaiva, projekti } = props;

  return (
    <>
      <H1>Lausuntopyynnön aineisto{props.esikatselu && " (esikatselu)"}</H1>
      <H2 variant="lead" sx={{ mt: 8, mb: 8 }}>
        {projekti?.velho.nimi}
      </H2>
      <p>
        Huomioi, että tämä sisältö on tarkasteltavissa <b>{formatDate(poistumisPaiva)}</b> asti, jonka jälkeen sisältö poistuu näkyvistä.
      </p>
      <Section noDivider>
        {props.esikatselu && (
          <Notification type={NotificationType.INFO_GRAY}>
            Esikatselutilassa voit nähdä, miltä linkin sisältö näyttää vastaanottajille. Varsinaisessa linkissä voi avata aineistoja uuteen
            välilehteen yksi kerrallaan tai ladata ne kaikki kerallaan omalle koneellesi.
          </Notification>
        )}
        {aineistot?.length && <H2>Suunnitelma</H2>}
        <AineistoNahtavillaAccordion
          kategoriat={aineistoKategoriat.listKategoriat()}
          aineistot={aineistot}
          esikatselu={!!props.esikatselu}
        />
        {!!lisaAineistot?.length && (
          <ContentSpacer>
            <H2>Lisäaineistot</H2>
            <ul style={{ listStyle: "none" }}>
              {lisaAineistot.map((tiedosto, index) => (
                <li key={index}>
                  <LadattavaTiedostoComponent tiedosto={tiedosto} esikatselu={props.esikatselu} />
                </li>
              ))}
            </ul>
          </ContentSpacer>
        )}
      </Section>
      {aineistopaketti && (
        <Section noDivider>
          <ButtonLink disabled={props.esikatselu} href={aineistopaketti}>
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
  aineistot: LadattavaTiedosto[] | null | undefined;
  esikatselu: boolean;
}

const AineistoNahtavillaAccordion: FunctionComponent<AineistoNahtavillaAccordionProps> = ({ aineistot, kategoriat, esikatselu }) => {
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
                <AineistoNahtavillaAccordion kategoriat={kategoria.alaKategoriat} aineistot={aineistot} esikatselu={esikatselu} />
              )}
            </>
          ),
        })),
    [kategoriat, aineistot, t, esikatselu]
  );

  return <HassuAccordion items={accordionItems} />;
};
