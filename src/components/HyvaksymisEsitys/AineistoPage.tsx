import React, { ReactElement, useMemo } from "react";
import Section from "@components/layout/Section2";
import { getAineistoKategoriat } from "hassu-common/aineistoKategoriat";
import { HyvaksymisEsityksenAineistot, LadattavaTiedosto } from "@services/api";
import { formatDate } from "hassu-common/util/dateUtils";
import DownloadIcon from "@mui/icons-material/Download";
import ButtonLink from "@components/button/ButtonLink";
import { H1, H2, H3, H4, H5 } from "@components/Headings";
import Notification, { NotificationType } from "@components/notification/Notification";
import SuunnittelmaLadattavatTiedostotAccordion from "@components/LadattavatTiedostot/SuunnitelmaAccordion";
import SectionContent from "@components/layout/SectionContent";
import HassuGrid from "@components/HassuGrid";
import HassuGridItem from "@components/HassuGridItem";
import useTranslation from "next-translate/useTranslation";
import LadattavaTiedostoComponent from "@components/LadattavatTiedostot/LadattavaTiedosto";
import HassuAccordion from "@components/HassuAccordion";
import { kuntametadata } from "common/kuntametadata";

export default function HyvaksymisEsitysAineistoPage(props: HyvaksymisEsityksenAineistot & { esikatselu?: boolean }): ReactElement {
  const {
    aineistopaketti,
    suunnitelma,
    poistumisPaiva,
    kiireellinen,
    lisatiedot,
    laskutustiedot,
    projektipaallikonYhteystiedot,
    hyvaksymisEsitys,
    kuntaMuistutukset,
    lausunnot,
    maanomistajaluettelo,
    kuulutuksetJaKutsu,
    muutAineistot,
    perustiedot,
  } = props;

  const { suunnitelmanNimi, asiatunnus, vastuuorganisaatio, yTunnus } = perustiedot;

  const muistutukset = useMemo(() => {
    const kunnat = perustiedot.kunnat ?? [];
    return kunnat.reduce<Record<string, LadattavaTiedosto[]>>((acc, kunta) => {
      acc[kunta] =
        kuntaMuistutukset
          ?.filter((muistutus) => muistutus.kunta === kunta)
          .map<LadattavaTiedosto>(({ kunta, __typename, ...ladattavaTiedosto }) => ({
            __typename: "LadattavaTiedosto",
            ...ladattavaTiedosto,
          })) ?? [];
      return acc;
    }, {});
  }, [kuntaMuistutukset, perustiedot.kunnat]);
  const { t } = useTranslation("common");

  const projarinOrganisaatio = projektipaallikonYhteystiedot?.elyOrganisaatio
    ? t(`viranomainen.${projektipaallikonYhteystiedot.elyOrganisaatio}`)
    : projektipaallikonYhteystiedot?.organisaatio;

  const muistutusMaara = useMemo(() => Object.values(muistutukset).flat().length ?? 0, [muistutukset]);

  const kategoriat = useMemo(
    () => getAineistoKategoriat({ projektiTyyppi: perustiedot.projektiTyyppi }).listKategoriat(),
    [perustiedot.projektiTyyppi]
  );
  return (
    <>
      <H1>Hyväksymisesitys{props.esikatselu && " (esikatselu)"}</H1>
      <H2 variant="lead" sx={{ mt: 8, mb: 8 }}>
        {suunnitelmanNimi}
      </H2>
      {props.esikatselu && (
        <Notification type={NotificationType.INFO_GRAY}>
          Esikatselutilassa voit nähdä, miltä linkin sisältö näyttää vastaanottajille. Varsinaisessa linkissä voi avata aineistoja uuteen
          välilehteen yksi kerrallaan.
        </Notification>
      )}
      <Section noDivider>
        <p>
          Huomioi, että tämä sisältö on tarkasteltavissa <b>{formatDate(poistumisPaiva)}</b> asti, jonka jälkeen sisältö poistuu näkyvistä.
        </p>
        <SectionContent>
          <H4>Pyydetään kiireellistä käsittelyä: {kiireellinen ? "KYLLÄ" : "EI"}</H4>
        </SectionContent>
        {!!lisatiedot && (
          <SectionContent>
            <H4>Lisätietoa vastaanottajalle</H4>
            <p>{lisatiedot}</p>
          </SectionContent>
        )}
      </Section>
      <Section noDivider>
        <SectionContent>
          <H2>Laskutustiedot hyväksymismaksua varten</H2>
          <HassuGrid cols={3} sx={{ width: { lg: "70%", sm: "100%" }, rowGap: 0, marginTop: "2em", marginBottom: "2.5em" }}>
            <HassuGridItem colSpan={1}>
              <H4>Suunnitelman nimi</H4>
              <p>{suunnitelmanNimi || "-"}</p>
            </HassuGridItem>
            <HassuGridItem colSpan={2}>
              <H4>Asiatunnus</H4>
              <p>{asiatunnus || "-"}</p>
            </HassuGridItem>
            <HassuGridItem colSpan={1}>
              <H4>Vastuuorganisaatio</H4>
              <p>{vastuuorganisaatio ? t(`viranomainen.${vastuuorganisaatio}`) : "-"}</p>
            </HassuGridItem>
            <HassuGridItem colSpan={2}>
              <H4>Y-tunnus</H4>
              <p>{yTunnus || "-"}</p>
            </HassuGridItem>
            <HassuGridItem colSpan={1}>
              <H4>OVT-tunnus</H4>
              <p>{laskutustiedot?.ovtTunnus || "-"}</p>
            </HassuGridItem>
            <HassuGridItem colSpan={2}>
              <H4>Verkkolaskuoperaattorin välittäjätunnus</H4>
              <p>{laskutustiedot?.verkkolaskuoperaattorinTunnus || "-"}</p>
            </HassuGridItem>
            <HassuGridItem colSpan={3}>
              <H4>Viitetieto</H4>
              <p>{laskutustiedot?.viitetieto || "-"}</p>
            </HassuGridItem>
          </HassuGrid>
        </SectionContent>
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
        <H2>Hyväksymisesityksen aineisto</H2>
        <H3>{`Hyväksymisesitys (${hyvaksymisEsitys?.length ?? 0})`}</H3>
        {hyvaksymisEsitys?.length ? (
          <ul style={{ listStyle: "none" }}>
            {hyvaksymisEsitys?.map((tiedosto, index) => (
              <li key={index}>
                <LadattavaTiedostoComponent tiedosto={tiedosto} esikatselu={props.esikatselu} />
              </li>
            ))}
          </ul>
        ) : (
          <div>Ei aineistoja</div>
        )}
        <H3>{`Suunnitelma (${suunnitelma?.length ?? 0})`}</H3>
        <SuunnittelmaLadattavatTiedostotAccordion kategoriat={kategoriat} aineistot={suunnitelma} esikatselu={!!props.esikatselu} />
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
                              <LadattavaTiedostoComponent tiedosto={tiedosto} esikatselu={props.esikatselu} />
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
                      <LadattavaTiedostoComponent tiedosto={tiedosto} esikatselu={props.esikatselu} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div>Ei aineistoja</div>
              ),
            },
            {
              id: "3",
              title: <H3 sx={{ margin: 0 }}>{`Maanomistajaluettelo (${maanomistajaluettelo?.length ?? 0})`}</H3>,
              content: maanomistajaluettelo?.length ? (
                <ul style={{ listStyle: "none" }}>
                  {maanomistajaluettelo?.map((tiedosto, index) => (
                    <li key={index}>
                      <LadattavaTiedostoComponent tiedosto={tiedosto} esikatselu={props.esikatselu} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div>Ei aineistoja</div>
              ),
            },
            {
              id: "4",
              title: <H3 sx={{ margin: 0 }}>{`Kuulutukset ja kutsu vuorovaikutukseen (${kuulutuksetJaKutsu?.length ?? 0})`}</H3>,
              content: kuulutuksetJaKutsu?.length ? (
                <ul style={{ listStyle: "none" }}>
                  {kuulutuksetJaKutsu?.map((tiedosto, index) => (
                    <li key={index}>
                      <LadattavaTiedostoComponent tiedosto={tiedosto} esikatselu={props.esikatselu} />
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
                      <LadattavaTiedostoComponent tiedosto={tiedosto} esikatselu={props.esikatselu} />
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
