import React, { ReactElement, useMemo } from "react";
import Section from "@components/layout/Section2";
import { getAineistoKategoriat } from "hassu-common/aineistoKategoriat";
import { KayttajaTyyppi, LadattavaTiedosto, LadattuTiedostoInputNew, TallennaEnnakkoNeuvotteluInput } from "@services/api";
import { formatDate } from "hassu-common/util/dateUtils";
import { H1, H2, H3, H4, H5 } from "@components/Headings";
import Notification, { NotificationType } from "@components/notification/Notification";
import SuunnittelmaLadattavatTiedostotAccordion from "@components/LadattavatTiedostot/SuunnitelmaAccordion";
import SectionContent from "@components/layout/SectionContent";
import useTranslation from "next-translate/useTranslation";
import LadattavaTiedostoComponent from "@components/LadattavatTiedostot/LadattavaTiedosto";
import HassuAccordion from "@components/HassuAccordion";
import { kuntametadata } from "common/kuntametadata";
import { useProjekti } from "src/hooks/useProjekti";
import ButtonLink from "@components/button/ButtonLink";
import DownloadIcon from "@mui/icons-material/Download";

export default function EnnakkoNeuvotteluEsikatseluPage(): ReactElement {
  const { data: projekti } = useProjekti();
  const ennakkoNeuvotteluInput: TallennaEnnakkoNeuvotteluInput | undefined = useMemo(() => {
    if (typeof window !== "undefined") {
      const localStorageData = localStorage.getItem("tallennaEnnakkoNeuvotteluInput");
      return localStorageData
        ? (JSON.parse(localStorageData) as TallennaEnnakkoNeuvotteluInput)
        : { oid: "", versio: 0, ennakkoNeuvottelu: {}, laheta: false };
    }
  }, []);

  const muistutukset = useMemo(() => {
    const kunnat = projekti?.velho.kunnat ?? [];
    return kunnat.reduce<Record<string, LadattavaTiedosto[]>>((acc, kunta) => {
      acc[kunta] =
        ennakkoNeuvotteluInput?.ennakkoNeuvottelu.muistutukset
          ?.filter((muistutus) => muistutus.kunta === kunta)
          .map<LadattavaTiedosto>(({ kunta, ...ladattavaTiedosto }) => ({
            __typename: "LadattavaTiedosto",
            ...ladattavaTiedosto,
          })) ?? [];
      return acc;
    }, {});
  }, [ennakkoNeuvotteluInput, projekti]);
  const { t } = useTranslation("common");
  const projektipaallikonYhteystiedot = projekti?.kayttoOikeudet?.find((k) => k.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO);

  const projarinOrganisaatio = projektipaallikonYhteystiedot?.elyOrganisaatio
    ? t(`viranomainen.${projektipaallikonYhteystiedot.elyOrganisaatio}`)
    : projektipaallikonYhteystiedot?.organisaatio;

  const muistutusMaara = useMemo(() => Object.values(muistutukset).flat().length ?? 0, [muistutukset]);

  const kategoriat = useMemo(() => getAineistoKategoriat({ projektiTyyppi: projekti?.velho.tyyppi }).listKategoriat(), [projekti]);

  if (!projekti || !ennakkoNeuvotteluInput?.oid) {
    return <></>;
  }
  const { suunnitelma, maanomistajaluettelo, lausunnot, kuulutuksetJaKutsu, muuAineistoKoneelta, muuAineistoVelhosta, poistumisPaiva } =
    ennakkoNeuvotteluInput.ennakkoNeuvottelu;
  const muutAineistot: LadattavaTiedosto[] = [];
  muuAineistoKoneelta?.forEach((a) => muutAineistot.push({ __typename: "LadattavaTiedosto", nimi: a.nimi }));
  muuAineistoVelhosta?.forEach((a) => muutAineistot.push({ __typename: "LadattavaTiedosto", nimi: a.nimi }));
  const allMaanomistajaluettelo: LadattuTiedostoInputNew[] = [];
  projekti.ennakkoNeuvottelu?.tuodutTiedostot?.maanomistajaluettelo?.forEach((m) =>
    allMaanomistajaluettelo.push({ nimi: m.nimi, uuid: "", tiedosto: m.nimi })
  );
  allMaanomistajaluettelo.push(...(maanomistajaluettelo ?? []));
  const allKuulutuksetJaKutsu: LadattuTiedostoInputNew[] = [];
  projekti.ennakkoNeuvottelu?.tuodutTiedostot?.kuulutuksetJaKutsu?.forEach((m) =>
    allKuulutuksetJaKutsu.push({ nimi: m.nimi, uuid: "", tiedosto: m.nimi })
  );
  allKuulutuksetJaKutsu.push(...(kuulutuksetJaKutsu ?? []));
  return (
    <>
      <H1>Ennakkoneuvottelu (esikatselu)</H1>
      <H2 variant="lead" sx={{ mt: 8, mb: 8 }}>
        {projekti?.velho.nimi}
      </H2>

      <Notification type={NotificationType.INFO_GRAY}>
        Esikatselutilassa voit nähdä, miltä linkin sisältö näyttää vastaanottajille. Varsinaisessa linkissä voi avata aineistoja uuteen
        välilehteen yksi kerrallaan.
      </Notification>

      <Section noDivider>
        <p>
          Huomioi, että tämä sisältö on tarkasteltavissa <b>{formatDate(poistumisPaiva)}</b> asti, jonka jälkeen sisältö poistuu näkyvistä.
        </p>
        {!!ennakkoNeuvotteluInput?.ennakkoNeuvottelu.lisatiedot && (
          <SectionContent>
            <H4>Lisätietoa vastaanottajalle</H4>
            <p>{ennakkoNeuvotteluInput.ennakkoNeuvottelu.lisatiedot}</p>
          </SectionContent>
        )}
      </Section>
      <Section>
        <SectionContent sx={{ "> p": { marginTop: 0 } }}>
          <H2 style={{ marginBottom: "0.5em" }}>Yhteystiedot</H2>
          <p>Lisätietoja antavat</p>
          <p>
            {projektipaallikonYhteystiedot?.etunimi} {projektipaallikonYhteystiedot?.sukunimi}, projektipäällikkö
          </p>
          <p>puh. {projektipaallikonYhteystiedot?.puhelinnumero}</p>
          <p>
            {projektipaallikonYhteystiedot?.email} ({projarinOrganisaatio})
          </p>
        </SectionContent>
      </Section>

      <Section>
        <H2>Ennakkoneuvottelun aineisto</H2>
        <H3>{`Suunnitelma (${suunnitelma?.length ?? 0})`}</H3>
        <SuunnittelmaLadattavatTiedostotAccordion
          kategoriat={kategoriat}
          aineistot={suunnitelma?.map((a) => {
            return { ...a, __typename: "LadattavaTiedosto", linkki: "esikatselu" };
          })}
          esikatselu={true}
        />
      </Section>
      <Section>
        <H2>Vuorovaikutus</H2>
        <HassuAccordion
          items={[
            {
              id: "1",
              title: <H3 sx={{ margin: 0 }}>{`Muistutukset (${muistutusMaara})`}</H3>,
              content: (
                <div>
                  {Object.keys(muistutukset).map((kunta) => (
                    <div key={kunta} style={{ marginTop: "1em" }}>
                      <H5>{kuntametadata.nameForKuntaId(parseInt(kunta), "fi") + ` (${muistutukset[kunta]?.length ?? 0})`}</H5>
                      {muistutukset[kunta]?.length ? (
                        <ul style={{ listStyle: "none" }}>
                          {muistutukset[kunta]?.map((tiedosto, index) => (
                            <li key={index}>
                              <LadattavaTiedostoComponent tiedosto={{ ...tiedosto, linkki: "esikatselu" }} esikatselu={true} />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div>Ei muistutuksia</div>
                      )}
                    </div>
                  ))}
                </div>
              ),
            },
            {
              id: "2",
              title: <H3 sx={{ margin: 0 }}>{`Lausunnot (${lausunnot?.length ?? 0})`}</H3>,
              content: lausunnot?.length ? (
                <ul style={{ listStyle: "none" }}>
                  {lausunnot?.map((tiedosto, index) => (
                    <li key={index}>
                      <LadattavaTiedostoComponent
                        tiedosto={{ ...tiedosto, __typename: "LadattavaTiedosto", linkki: "esikatselu" }}
                        esikatselu={true}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div>Ei aineistoja</div>
              ),
            },
            {
              id: "3",
              title: <H3 sx={{ margin: 0 }}>{`Maanomistajaluettelo (${allMaanomistajaluettelo?.length ?? 0})`}</H3>,
              content: allMaanomistajaluettelo?.length ? (
                <ul style={{ listStyle: "none" }}>
                  {allMaanomistajaluettelo?.map((tiedosto, index) => (
                    <li key={index}>
                      <LadattavaTiedostoComponent
                        tiedosto={{ ...tiedosto, __typename: "LadattavaTiedosto", linkki: "esikatselu" }}
                        esikatselu={true}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div>Ei aineistoja</div>
              ),
            },
            {
              id: "4",
              title: <H3 sx={{ margin: 0 }}>{`Kuulutukset ja kutsu vuorovaikutukseen (${allKuulutuksetJaKutsu?.length ?? 0})`}</H3>,
              content: allKuulutuksetJaKutsu?.length ? (
                <ul style={{ listStyle: "none" }}>
                  {allKuulutuksetJaKutsu?.map((tiedosto, index) => (
                    <li key={index}>
                      <LadattavaTiedostoComponent
                        tiedosto={{ ...tiedosto, __typename: "LadattavaTiedosto", linkki: "esikatselu" }}
                        esikatselu={true}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div>Ei aineistoja</div>
              ),
            },
          ]}
        />
      </Section>
      <Section noDivider>
        <HassuAccordion
          items={[
            {
              id: "3",
              title: <H2 sx={{ margin: 0 }}>{`Muu tekninen aineisto (${muutAineistot?.length ?? 0})`}</H2>,
              content: muutAineistot?.length ? (
                <ul style={{ listStyle: "none" }}>
                  {muutAineistot?.map((tiedosto, index) => (
                    <li key={index}>
                      <LadattavaTiedostoComponent tiedosto={{ ...tiedosto, linkki: "esikatselu" }} esikatselu={true} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div>Ei aineistoja</div>
              ),
            },
          ]}
        />
      </Section>
      <Section noDivider>
        <ButtonLink disabled={true}>
          Lataa kaikki
          <DownloadIcon className="ml-2" />
        </ButtonLink>
      </Section>
    </>
  );
}
