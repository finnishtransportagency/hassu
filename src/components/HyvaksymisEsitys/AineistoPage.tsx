import React, { ReactElement } from "react";
import Section from "@components/layout/Section2";
import { aineistoKategoriat } from "hassu-common/aineistoKategoriat";
import { KunnallinenLadattavaTiedosto, LadattavaTiedosto, ProjektiKayttajaJulkinen } from "@services/api";
import { formatDate } from "hassu-common/util/dateUtils";
import DownloadIcon from "@mui/icons-material/Download";
import ButtonLink from "@components/button/ButtonLink";
import { H1, H2, H3, H4 } from "@components/Headings";
import Notification, { NotificationType } from "@components/notification/Notification";
import SuunnittelmaLadattavatTiedostotAccordion from "@components/LadattavatTiedostot/SuunnitelmaAccordion";
import { Stack } from "@mui/material";
import SectionContent from "@components/layout/SectionContent";

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
      <Section>
        <p>
          Huomioi, että tämä sisältö on tarkasteltavissa <b>{formatDate(poistumisPaiva)}</b> asti, jonka jälkeen sisältö poistuu näkyvistä.
        </p>
        <SectionContent>
          <H4>Pyydetään kiireellistä käsittelyä: //TODO</H4>
        </SectionContent>
        <SectionContent>
          <H4>Lisätietoa vastaanottajalle</H4>
          <p>TODO</p>
        </SectionContent>
        <SectionContent>
          <H4>Laskutustiedot hyväksymismaksua varten</H4>
          <Stack>TODO</Stack>
        </SectionContent>
        <SectionContent>
          <H4>Yhteystiedot</H4>
          <p>TODO</p>
        </SectionContent>
      </Section>

      <Section>
        <H2>Hyväksymisesityksen aineisto</H2>
        <H3>Hyväksymisesitys</H3>
        <div>TODO</div>
        <H3>Suunnitelma</H3>
        <SuunnittelmaLadattavatTiedostotAccordion
          kategoriat={aineistoKategoriat.listKategoriat()}
          aineistot={suunnitelma}
          esikatselu={!!props.esikatselu}
        />
      </Section>
      <Section>
        <H2>Vuorovaikutus</H2>
        <H3>TODO Muistutukset</H3>
        <H3>TODO Lausunnot</H3>
        <H3>TODO Maanomistajaluettelo</H3>
        <H3>TODO Kuulutukset ja kutsu vuorovaikutukseen</H3>
      </Section>
      <Section>
        <H2>TODO Muu tekninen aineisto</H2>
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
