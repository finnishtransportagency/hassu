import React, { ReactElement } from "react";
import Section from "@components/layout/Section2";
import { LadattavaTiedosto, ProjektiJulkinen } from "@services/api";
import { formatDate } from "hassu-common/util/dateUtils";
import DownloadIcon from "@mui/icons-material/Download";
import ButtonLink from "@components/button/ButtonLink";
import ContentSpacer from "@components/layout/ContentSpacer";
import LadattavaTiedostoComponent from "@components/projekti/lausuntopyynnot/LadattavaTiedosto";
import { kuntametadata } from "common/kuntametadata";
import { H1, H2, H3 } from "@components/Headings";
import Notification, { NotificationType } from "@components/notification/Notification";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";

type Props = {
  esikatselu?: boolean;
  projekti: ProjektiJulkinen | ProjektiLisatiedolla | null | undefined;
  poistumisPaiva: string;
  muutAineistot: LadattavaTiedosto[] | null | undefined;
  muistutukset: LadattavaTiedosto[] | null | undefined;
  kunta: number | null | undefined;
  aineistopaketti: string | null | undefined;
};

export default function LausuntopyyntoTaydennysAineistoPage(props: Props): ReactElement {
  const { muutAineistot, muistutukset, aineistopaketti, poistumisPaiva, kunta, projekti, esikatselu } = props;
  return (
    <>
      <H1>Lausuntopyynnön täydennysaineisto{esikatselu && " (esikatselu)"}</H1>
      <H2 variant="lead" className="mt-8 mb-8">
        {projekti?.velho.nimi}
      </H2>
      <p>
        Huomioi, että tämä sisältö on tarkasteltavissa <b>{formatDate(poistumisPaiva)}</b> asti, jonka jälkeen sisältö poistuu näkyvistä.
      </p>
      <Section noDivider>
        {esikatselu && (
          <Notification type={NotificationType.INFO_GRAY}>
            Esikatselutilassa voit nähdä, miltä linkin sisältö näyttää vastaanottajille. Varsinaisessa linkissä voi avata aineistoja uuteen
            välilehteen yksi kerrallaan tai ladata ne kaikki kerallaan omalle koneellesi.
          </Notification>
        )}
        {kunta && <H2>{kuntametadata.nameForKuntaId(kunta, "fi")}</H2>}
        {muistutukset && (
          <ContentSpacer>
            <H3>Muistutukset</H3>
            <ul style={{ listStyle: "none " }}>
              {muistutukset.map((tiedosto, index) => (
                <li key={index}>
                  <LadattavaTiedostoComponent tiedosto={tiedosto} esikatselu={esikatselu} />
                </li>
              ))}
            </ul>
          </ContentSpacer>
        )}
        {muutAineistot && (
          <ContentSpacer>
            <H3>Muu aineisto</H3>
            <ul style={{ listStyle: "none " }}>
              {muutAineistot.map((tiedosto, index) => (
                <li key={index}>
                  <LadattavaTiedostoComponent tiedosto={tiedosto} esikatselu={esikatselu} />
                </li>
              ))}
            </ul>
          </ContentSpacer>
        )}
      </Section>
      {aineistopaketti && (
        <Section noDivider>
          <ButtonLink disabled={esikatselu} href={aineistopaketti}>
            Lataa kaikki
            <DownloadIcon className="ml-2" />
          </ButtonLink>
        </Section>
      )}
    </>
  );
}
