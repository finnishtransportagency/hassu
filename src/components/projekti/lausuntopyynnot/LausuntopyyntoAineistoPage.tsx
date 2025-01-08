import React, { ReactElement, useMemo } from "react";
import Section from "@components/layout/Section2";
import { getAineistoKategoriat } from "hassu-common/aineistoKategoriat";
import { LadattavaTiedosto, ProjektiJulkinen } from "@services/api";
import { formatDate } from "hassu-common/util/dateUtils";
import DownloadIcon from "@mui/icons-material/Download";
import ButtonLink from "@components/button/ButtonLink";
import ContentSpacer from "@components/layout/ContentSpacer";
import { H1, H2 } from "@components/Headings";
import Notification, { NotificationType } from "@components/notification/Notification";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import LadattavaTiedostoComponent from "@components/LadattavatTiedostot/LadattavaTiedosto";
import SuunnittelmaLadattavatTiedostotAccordion from "@components/LadattavatTiedostot/SuunnitelmaAccordion";
import ExtLink from "@components/ExtLink";


type Props = {
  esikatselu?: boolean;
  lisaAineistot: LadattavaTiedosto[] | null | undefined;
  aineistopaketti: string | null | undefined;
  aineistot: LadattavaTiedosto[] | null | undefined;
  poistumisPaiva: string | undefined;
  projekti: ProjektiJulkinen | ProjektiLisatiedolla | null | undefined;
  julkinen: boolean;
}

export default function LausuntopyyntoAineistoPage(props: Readonly<Props>): ReactElement {
  const { lisaAineistot, aineistopaketti, aineistot, poistumisPaiva, projekti, julkinen } = props;

  const kategoriat = useMemo(
    () => getAineistoKategoriat({ projektiTyyppi: projekti?.velho.tyyppi }).listKategoriat(),
    [projekti?.velho.tyyppi]
  );

  return (
    <>
      <H1>Lausuntopyynnön aineisto{props.esikatselu && " (esikatselu)"}</H1>
      <H2 variant="lead" sx={{ mt: 8, mb: 8 }}>
        {projekti?.velho.nimi}
      </H2>
      <p>
        Huomioi, että tämä sisältö on tarkasteltavissa <b>{formatDate(poistumisPaiva)}</b> asti, jonka jälkeen sisältö poistuu näkyvistä.
      </p>
      {projekti && julkinen && (
            <Section>
            <ExtLink href={`/suunnitelma/${projekti.oid}`}>Linkki suunnitelmaan kansalaispuolelle</ExtLink>
            </Section>
        )}
      <Section noDivider>
        {props.esikatselu && (
          <Notification type={NotificationType.INFO_GRAY}>
            Esikatselutilassa voit nähdä, miltä linkin sisältö näyttää vastaanottajille. Varsinaisessa linkissä voi avata aineistoja uuteen
            välilehteen yksi kerrallaan tai ladata ne kaikki kerallaan omalle koneellesi.
          </Notification>
        )}
        <H2>Suunnitelma</H2>
        <SuunnittelmaLadattavatTiedostotAccordion kategoriat={kategoriat} aineistot={aineistot} esikatselu={!!props.esikatselu} />
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
