import React, { ReactElement } from "react";
import Section from "@components/layout/Section";
import { LadattavatTiedostot } from "@services/api";
import { formatDate } from "hassu-common/util/dateUtils";
import DownloadIcon from "@mui/icons-material/Download";
import ButtonLink from "@components/button/ButtonLink";
import SectionContent from "@components/layout/SectionContent";
import { useEsikatseleLausuntoPyynnonTaydennysAineistot } from "src/hooks/useEsikatseleLausuntoPyynnonTaydennysAineistot";
import Notification, { NotificationType } from "@components/notification/Notification";
import LadattavaTiedosto from "@components/projekti/lausuntopyynnot/LadattavaTiedosto";
import { useProjekti } from "src/hooks/useProjekti";
import { kuntametadata } from "common/kuntametadata";
import { PreviewExpiredError } from "common/error/PreviewExpiredError";

export default function EsikatseleLausuntopyynnonTaydennysAineistot(): ReactElement {
  const data: null | undefined | LadattavatTiedostot | PreviewExpiredError = useEsikatseleLausuntoPyynnonTaydennysAineistot().data;
  const { data: projekti } = useProjekti();

  if (data instanceof PreviewExpiredError) {
    return <>Tarvittu data esikatselua varten on unohtunut. Sulje välilehti ja avaa esikatselu uudestaan.</>;
  }

  if (!data) {
    return <></>;
  }

  let poistumisPaiva = data?.poistumisPaiva;
  const { muutAineistot, muistutukset } = data;

  return (
    <>
      <h1 className="vayla-header">Lausuntopyynnön täydennysaineisto (esikatselu)</h1>
      <h2 className="mt-8 mb-8">{projekti?.velho.nimi}</h2>
      <p>
        Huomioi, että tämä sisältö on tarkasteltavissa <b>{formatDate(poistumisPaiva)}</b> asti, jonka jälkeen sisältö poistuu näkyvistä.
      </p>
      <Section>
        <Notification type={NotificationType.INFO_GRAY}>
          Esikatselutilassa voit nähdä, miltä linkin sisältö näyttää vastaanottajille. Varsinaisessa linkissä voi avata aineistoja uuteen
          välilehteen yksi kerrallaan tai ladata ne kaikki kerallaan omalle koneellesi.
        </Notification>
        {data.kunta && <h2 className="vayla-title">{kuntametadata.nameForKuntaId(data.kunta, "fi")}</h2>}
        {!!muistutukset?.length && (
          <SectionContent>
            <h2 className="vayla-subtitle">Muistutukset</h2>
            <ul style={{ listStyle: "none" }}>
              {muistutukset.map((tiedosto, index) => {
                return (
                  <li key={index}>
                    <LadattavaTiedosto tiedosto={tiedosto} esikatselu />
                  </li>
                );
              })}
            </ul>
          </SectionContent>
        )}
        {!!muutAineistot?.length && (
          <SectionContent>
            <h2 className="vayla-subtitle">Muu aineisto</h2>
            <ul style={{ listStyle: "none" }}>
              {muutAineistot.map((tiedosto, index) => {
                return (
                  <li key={index}>
                    <LadattavaTiedosto tiedosto={tiedosto} esikatselu />
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
