import React, { ReactElement } from "react";
import Section from "@components/layout/Section";
import { useLausuntoPyynnonTaydennysAineistot } from "src/hooks/useLausuntoPyynnonTaydennysAineistot";
import { LadattavatTiedostot } from "@services/api";
import { formatDate } from "hassu-common/util/dateUtils";
import DownloadIcon from "@mui/icons-material/Download";
import ButtonLink from "@components/button/ButtonLink";
import SectionContent from "@components/layout/SectionContent";
import { renderLadattavaTiedosto } from "@components/projekti/lausuntopyynnot/renderLadattavaTiedosto";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { kuntametadata } from "common/kuntametadata";
import VanhentunutAineistolinkki from "@components/projekti/lausuntopyynnot/VanhentunutAineistolinkki";

export default function Lausuntopyyntoaineistot(): ReactElement {
  const data: null | undefined | LadattavatTiedostot = useLausuntoPyynnonTaydennysAineistot().data;
  const { data: projekti } = useProjektiJulkinen();
  let poistumisPaiva = data?.poistumisPaiva;
  if (!(poistumisPaiva && data && projekti)) {
    return <></>;
  }
  if (data.linkkiVanhentunut) {
    return <VanhentunutAineistolinkki projekti={projekti} data={data} />;
  }
  const { muutAineistot, muistutukset } = data;
  return (
    <>
      <h1 className="vayla-header">Lausuntopyynnön täydennysaineisto</h1>
      <h2 className="mt-8 mb-8">{projekti?.velho.nimi}</h2>
      <p>
        Huomioi, että tämä sisältö on tarkasteltavissa <b>{formatDate(poistumisPaiva)}</b> asti, jonka jälkeen sisältö poistuu näkyvistä.
      </p>
      {data.kunta && <h2 className="vayla-title">{kuntametadata.nameForKuntaId(data.kunta, "fi")}</h2>}
      <Section>
        {muistutukset && (
          <SectionContent>
            <h2 className="vayla-subtitle">Muistutukset</h2>
            <ul style={{ listStyle: "none " }}>
              {muistutukset.map((tiedosto, index) => (
                <li key={index}>{renderLadattavaTiedosto(tiedosto)}</li>
              ))}
            </ul>
          </SectionContent>
        )}
        {muutAineistot && (
          <SectionContent>
            <h2 className="vayla-subtitle">Muu aineisto</h2>
            <ul style={{ listStyle: "none " }}>
              {muutAineistot.map((tiedosto, index) => (
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
