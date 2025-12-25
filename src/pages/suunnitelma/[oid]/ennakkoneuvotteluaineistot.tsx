import React, { ReactElement, useMemo } from "react";
import VanhentunutAineistolinkki, { AineistoType } from "@components/projekti/common/Aineistot/VanhentunutAineistolinkki";
import { useEnnakkoNeuvottelunAineistot } from "src/hooks/useEnnakkoNeuvottelunAineistot";
import { EnnakkoNeuvottelunAineistot, LadattavaTiedosto } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import { getAineistoKategoriat } from "common/aineistoKategoriat";
import { H1, H2, H3, H4, H5 } from "@components/Headings";
import Section from "@components/layout/Section2";
import { formatDate } from "common/util/dateUtils";
import SectionContent from "@components/layout/SectionContent";
import HassuAccordion from "@components/HassuAccordion";
import { kuntametadata } from "common/kuntametadata";
import LadattavaTiedostoComponent from "@components/LadattavatTiedostot/LadattavaTiedosto";
import ButtonLink from "@components/button/ButtonLink";
import DownloadIcon from "@mui/icons-material/Download";
import SuunnittelmaLadattavatTiedostotAccordion from "@components/LadattavatTiedostot/SuunnitelmaAccordion";

export default function EnnakkoNeuvotteluLinkki(): ReactElement {
  const { data } = useEnnakkoNeuvottelunAineistot();
  if (!data) {
    return <></>;
  }
  if (data.linkkiVanhentunut) {
    return (
      <VanhentunutAineistolinkki
        poistumisPaiva={data.poistumisPaiva}
        suunnitelmanNimi={data.perustiedot.suunnitelmanNimi}
        projarinYhteystiedot={data.projektipaallikonYhteystiedot}
        tyyppi={AineistoType.ENNAKKONEUVOTTELU}
      />
    );
  }
  return <EnnakkoNeuvotteluAineistoPage {...data} />;
}

function EnnakkoNeuvotteluAineistoPage(props: Readonly<EnnakkoNeuvottelunAineistot>): ReactElement {
  const {
    aineistopaketti,
    suunnitelma,
    poistumisPaiva,
    lisatiedot,
    projektipaallikonYhteystiedot,
    kuntaMuistutukset,
    lausunnot,
    maanomistajaluettelo,
    kuulutuksetJaKutsu,
    muutAineistot,
    linkitetynProjektinAineisto,
    perustiedot,
    hyvaksymisEsitys,
  } = props;

  const { suunnitelmanNimi } = perustiedot;

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
    : projektipaallikonYhteystiedot?.evkOrganisaatio
    ? t(`viranomainen.${projektipaallikonYhteystiedot.evkOrganisaatio}`)
    : projektipaallikonYhteystiedot?.organisaatio;

  const muistutusMaara = useMemo(() => Object.values(muistutukset).flat().length ?? 0, [muistutukset]);

  const kategoriat = useMemo(
    () => getAineistoKategoriat({ projektiTyyppi: perustiedot.projektiTyyppi }).listKategoriat(),
    [perustiedot.projektiTyyppi]
  );
  return (
    <>
      <H1>Ennakkotarkastus/ennakkoneuvottelu</H1>
      <H2 variant="lead" sx={{ mt: 8, mb: 8 }}>
        {suunnitelmanNimi}
      </H2>
      <Section noDivider>
        <p>
          Huomioi, että tämä sisältö on tarkasteltavissa <b>{poistumisPaiva ? formatDate(poistumisPaiva) : "-"}</b> asti, jonka jälkeen
          sisältö poistuu näkyvistä.
        </p>
        {!!lisatiedot && (
          <SectionContent>
            <H4>Lisätietoa vastaanottajalle</H4>
            <p>{lisatiedot}</p>
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
        <H2>{`Hyväksymisesitys (${hyvaksymisEsitys?.length ?? 0})`}</H2>
        {hyvaksymisEsitys?.length ? (
          <ul style={{ listStyle: "none" }}>
            {hyvaksymisEsitys?.map((tiedosto, index) => (
              <li key={index}>
                <LadattavaTiedostoComponent tiedosto={tiedosto} esikatselu={false} />
              </li>
            ))}
          </ul>
        ) : (
          <div>Ei aineistoja</div>
        )}
      </Section>
      <Section>
        <H2>{`Suunnitelma (${suunnitelma?.length ?? 0})`}</H2>
        <SuunnittelmaLadattavatTiedostotAccordion kategoriat={kategoriat} aineistot={suunnitelma} esikatselu={false} />
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
                              <LadattavaTiedostoComponent tiedosto={tiedosto} esikatselu={false} />
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
                      <LadattavaTiedostoComponent tiedosto={tiedosto} esikatselu={false} />
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
                      <LadattavaTiedostoComponent tiedosto={tiedosto} esikatselu={false} />
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
                      <LadattavaTiedostoComponent tiedosto={tiedosto} esikatselu={false} />
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
      <Section>
        <HassuAccordion
          items={[
            {
              id: "3",
              title: <H2 sx={{ margin: 0 }}>{`Muu tekninen aineisto (${muutAineistot?.length ?? 0})`}</H2>,
              content: muutAineistot?.length ? (
                <ul style={{ listStyle: "none" }}>
                  {muutAineistot?.map((tiedosto, index) => (
                    <li key={index}>
                      <LadattavaTiedostoComponent tiedosto={tiedosto} esikatselu={false} />
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
        <H3>{`Liittyvän suunnitelman aineisto (${linkitetynProjektinAineisto?.length ?? 0})`}</H3>
        <SuunnittelmaLadattavatTiedostotAccordion kategoriat={kategoriat} aineistot={linkitetynProjektinAineisto} esikatselu={false} />
      </Section>
      {aineistopaketti && (
        <Section noDivider>
          <ButtonLink href={aineistopaketti}>
            Lataa kaikki
            <DownloadIcon className="ml-2" />
          </ButtonLink>
        </Section>
      )}
    </>
  );
}
