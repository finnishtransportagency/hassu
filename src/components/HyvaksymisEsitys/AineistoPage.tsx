import React, { ReactElement } from "react";
import Section from "@components/layout/Section2";
import { aineistoKategoriat } from "hassu-common/aineistoKategoriat";
import { KunnallinenLadattavaTiedosto, LadattavaTiedosto, ProjektiKayttajaJulkinen } from "@services/api";
import { formatDate } from "hassu-common/util/dateUtils";
import DownloadIcon from "@mui/icons-material/Download";
import ButtonLink from "@components/button/ButtonLink";
import { H1, H2 } from "@components/Headings";
import Notification, { NotificationType } from "@components/notification/Notification";
import SuunnittelmaLadattavatTiedostotAccordion from "@components/LadattavatTiedostot/SuunnitelmaAccordion";

type Props = {
  projektinNimi?: string | null;
  esikatselu?: boolean;
  aineistopaketti: string | null | undefined;
  poistumisPaiva: string;
  linkkiVanhentunut?: boolean | null;
  hyvaksymisEsitys?: Array<LadattavaTiedosto> | null;
  suunnitelma?: Array<LadattavaTiedosto> | null;
  kuntaMuistutukset?: Array<KunnallinenLadattavaTiedosto> | null;
  lausunnot?: Array<LadattavaTiedosto> | null;
  kuulutuksetJaKutsu?: Array<LadattavaTiedosto> | null;
  muutAineistot?: Array<LadattavaTiedosto> | null;
  maanomistajaluettelo?: Array<LadattavaTiedosto> | null;
  projektipaallikonYhteystiedot?: ProjektiKayttajaJulkinen | null;
};

export default function HyvaksymisEsitysAineistoPage(props: Props): ReactElement {
  const { aineistopaketti, projektinNimi, suunnitelma, poistumisPaiva } = props;

  return (
    <>
      <H1>Hyväksymisesitys{props.esikatselu && " (esikatselu)"}</H1>
      <H2 variant="lead" sx={{ mt: 8, mb: 8 }}>
        {projektinNimi}
      </H2>
      {props.esikatselu && (
        <Notification type={NotificationType.INFO_GRAY}>
          Esikatselutilassa voit nähdä, miltä linkin sisältö näyttää vastaanottajille. Varsinaisessa linkissä voi avata aineistoja uuteen
          välilehteen yksi kerrallaan.
        </Notification>
      )}
      <p>
        Huomioi, että tämä sisältö on tarkasteltavissa <b>{formatDate(poistumisPaiva)}</b> asti, jonka jälkeen sisältö poistuu näkyvistä.
      </p>
      <Section noDivider>
        {suunnitelma?.length && <H2>Suunnitelma</H2>}
        <SuunnittelmaLadattavatTiedostotAccordion
          kategoriat={aineistoKategoriat.listKategoriat()}
          aineistot={suunnitelma}
          esikatselu={!!props.esikatselu}
        />
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
