import ContentSpacer from "@components/layout/ContentSpacer";
import Section from "@components/layout/Section2";
import { DefinitionList, StyledDefinitionList } from "@components/projekti/common/StyledDefinitionList";
import StyledLink from "@components/StyledLink";
import { styled } from "@mui/system";
import { Aineisto, AineistoTila, Kielitiedot, Linkki, VuorovaikutusKierrosJulkaisu } from "@services/api";
import { FILE_PATH_DELETED_PREFIX } from "common/links";
import { getKaannettavatKielet } from "hassu-common/kaannettavatKielet";
import React, { useMemo, FunctionComponent } from "react";

export const AineistotSection: FunctionComponent<{
  julkaisu: VuorovaikutusKierrosJulkaisu;
  kielitiedot: Kielitiedot | null | undefined;
}> = ({ julkaisu, kielitiedot }) => {
  const aineistoDefinitions: DefinitionList = useMemo(() => {
    return [
      {
        term: "Suunnitelmaluonnokset ja esittelyaineistot",
        definition: <SuunnitelmaluonnoksetJaEsittelyAineistot julkaisu={julkaisu} kielitiedot={kielitiedot} />,
      },
    ];
  }, [julkaisu, kielitiedot]);
  return (
    <Section>
      <StyledDefinitionList definitions={aineistoDefinitions} />
    </Section>
  );
};

const SuunnitelmaluonnoksetJaEsittelyAineistot: FunctionComponent<{
  julkaisu: VuorovaikutusKierrosJulkaisu;
  kielitiedot: Kielitiedot | null | undefined;
}> = ({ julkaisu, kielitiedot }) => {
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  const videolista: Linkki[] = useMemo(() => {
    return (
      julkaisu.videot?.reduce<Linkki[]>((acc, lokalisoituLinkki) => {
        const ensisijainenLinkki = ensisijainenKaannettavaKieli ? lokalisoituLinkki[ensisijainenKaannettavaKieli] : undefined;
        const toissijainenLinkki = toissijainenKaannettavaKieli ? lokalisoituLinkki[toissijainenKaannettavaKieli] : undefined;
        if (ensisijainenLinkki?.url) {
          acc.push(ensisijainenLinkki);
        }
        if (toissijainenLinkki?.url) {
          acc.push(toissijainenLinkki);
        }
        return acc;
      }, []) || []
    );
  }, [ensisijainenKaannettavaKieli, julkaisu.videot, toissijainenKaannettavaKieli]);

  const materiaalilinkit: Linkki[] = useMemo(() => {
    const linkit: Linkki[] = [];
    julkaisu.suunnittelumateriaali?.forEach((linkki) => {
      const ensisijainenLinkki = ensisijainenKaannettavaKieli ? linkki[ensisijainenKaannettavaKieli] : undefined;
      const toissijainenLinkki = toissijainenKaannettavaKieli ? linkki[toissijainenKaannettavaKieli] : undefined;
      if (ensisijainenLinkki?.url) {
        linkit.push(ensisijainenLinkki);
      }
      if (toissijainenLinkki?.url) {
        linkit.push(toissijainenLinkki);
      }
    });

    return linkit;
  }, [ensisijainenKaannettavaKieli, julkaisu.suunnittelumateriaali, toissijainenKaannettavaKieli]);

  return (
    <ContentSpacer gap={7}>
      {!!videolista.length && (
        <ContentSpacer gap={2}>
          <p>Videoesittely</p>
          <ContentSpacer as="ul" gap={2}>
            {videolista.map((video, index) => (
              <li key={index}>
                <StyledLink target="_blank" sx={{ fontWeight: 400 }} href={video.url}>
                  {video.nimi || video.url}
                </StyledLink>
              </li>
            ))}
          </ContentSpacer>
        </ContentSpacer>
      )}
      {!!julkaisu.esittelyaineistot?.length && (
        <ContentSpacer gap={2}>
          <p>Esittelyaineistot</p>
          <ContentSpacer as="ul" gap={2}>
            {julkaisu.esittelyaineistot.map((aineisto) => (
              <AineistoListElement key={aineisto.uuid || aineisto.dokumenttiOid} aineisto={aineisto} />
            ))}
          </ContentSpacer>
        </ContentSpacer>
      )}
      {!!julkaisu.suunnitelmaluonnokset?.length && (
        <ContentSpacer gap={2}>
          <p>Suunnitelmaluonnokset</p>
          <ContentSpacer as="ul" gap={2}>
            {julkaisu.suunnitelmaluonnokset.map((aineisto) => (
              <AineistoListElement key={aineisto.uuid || aineisto.dokumenttiOid} aineisto={aineisto} />
            ))}
          </ContentSpacer>
        </ContentSpacer>
      )}
      {!!materiaalilinkit.length && (
        <ContentSpacer gap={2}>
          <p>Muut esittelymateriaalit</p>
          <ContentSpacer as="ul" sx={{ ["& p"]: { marginBottom: 0 } }} gap={2}>
            {materiaalilinkit.map((materiaalilinkki, index) => (
              <li key={index}>
                <p>{materiaalilinkki.nimi}</p>
                <StyledLink target="_blank" sx={{ fontWeight: 400 }} href={materiaalilinkki.url}>
                  {materiaalilinkki.url}
                </StyledLink>
              </li>
            ))}
          </ContentSpacer>
        </ContentSpacer>
      )}
    </ContentSpacer>
  );
};

function AineistoListElement(props: { aineisto: Aineisto }): React.JSX.Element {
  const shouldShowHref =
    props.aineisto.tiedosto &&
    !props.aineisto.tiedosto.startsWith(FILE_PATH_DELETED_PREFIX) &&
    props.aineisto.tila !== AineistoTila.POISTETTU;
  const href = shouldShowHref ? props.aineisto.tiedosto || undefined : undefined;
  const nimi = props.aineisto.nimi ?? props.aineisto.tiedosto;

  if (href) {
    return (
      <Li>
        <StyledLink target="_blank" href={href}>
          {nimi}
        </StyledLink>
      </Li>
    );
  }

  return <Li>{nimi}</Li>;
}

const Li = styled("li")({ fontWeight: 400 });
