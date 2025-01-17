import React, { ReactElement } from "react";
import Section from "@components/layout/Section2";
import { LadattavaTiedosto } from "@services/api";
import { formatDate } from "hassu-common/util/dateUtils";
import DownloadIcon from "@mui/icons-material/Download";
import ButtonLink from "@components/button/ButtonLink";
import ContentSpacer from "@components/layout/ContentSpacer";
import { kuntametadata } from "common/kuntametadata";
import { H1, H2, H3 } from "@components/Headings";
import Notification, { NotificationType } from "@components/notification/Notification";
import LadattavaTiedostoComponent from "@components/LadattavatTiedostot/LadattavaTiedosto";
import ExtLink from "@components/ExtLink";

type Props = {
  esikatselu?: boolean;
  poistumisPaiva: string;
  muutAineistot: LadattavaTiedosto[] | null | undefined;
  muistutukset: LadattavaTiedosto[] | null | undefined;
  kunta: number | null | undefined;
  aineistopaketti: string | null | undefined;
  julkinen: boolean;
  nimi: string;
  projektiOid: string;
};

export default function LausuntopyyntoTaydennysAineistoPage(props: Props): ReactElement {
  const { muutAineistot, muistutukset, aineistopaketti, poistumisPaiva, kunta, nimi, esikatselu, julkinen, projektiOid } = props;
  return (
    <>
      <H1>Lausuntopyynnön täydennysaineisto{esikatselu && " (esikatselu)"}</H1>
      <H2 variant="lead" className="mt-8 mb-8">
        {nimi}
      </H2>
      <p>
        Huomioi, että tämä sisältö on tarkasteltavissa <b>{formatDate(poistumisPaiva)}</b> asti, jonka jälkeen sisältö poistuu näkyvistä.
      </p>
      {projektiOid && julkinen && (
        <Section>
          <ExtLink href={`/suunnitelma/${projektiOid}`}>Linkki suunnitelmaan kansalaispuolelle</ExtLink>
        </Section>
      )}
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
