import ContentSpacer from "@components/layout/ContentSpacer";
import Section from "@components/layout/Section2";
import { DefinitionList, StyledDefinitionList } from "@components/projekti/common/StyledDefinitionList";
import StyledLink from "@components/StyledLink";
import { Kielitiedot, Linkki, VuorovaikutusKierrosJulkaisu } from "@services/api";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import React, { Fragment, useMemo, VFC } from "react";

export const AineistotSection: VFC<{ julkaisu: VuorovaikutusKierrosJulkaisu; kielitiedot: Kielitiedot | null | undefined }> = ({
  julkaisu,
  kielitiedot,
}) => {
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  const videolista: Linkki[] = useMemo(() => {
    return (
      julkaisu.videot?.reduce<Linkki[]>((acc, lokalisoituLinkki) => {
        const ensisijainenLinkki = ensisijainenKaannettavaKieli ? lokalisoituLinkki[ensisijainenKaannettavaKieli] : undefined;
        const toissijainenLinkki = toissijainenKaannettavaKieli ? lokalisoituLinkki[toissijainenKaannettavaKieli] : undefined;
        if (ensisijainenLinkki) {
          acc.push(ensisijainenLinkki);
        }
        if (toissijainenLinkki) {
          acc.push(toissijainenLinkki);
        }
        return acc;
      }, []) || []
    );
  }, [ensisijainenKaannettavaKieli, julkaisu.videot, toissijainenKaannettavaKieli]);

  const materiaalilinkit: Linkki[] = useMemo(() => {
    const linkit: Linkki[] = [];
    const ensisijainenLinkki = ensisijainenKaannettavaKieli ? julkaisu.suunnittelumateriaali?.[ensisijainenKaannettavaKieli] : undefined;
    const toissijainenLinkki = toissijainenKaannettavaKieli ? julkaisu.suunnittelumateriaali?.[toissijainenKaannettavaKieli] : undefined;
    if (ensisijainenLinkki) {
      linkit.push(ensisijainenLinkki);
    }
    if (toissijainenLinkki) {
      linkit.push(toissijainenLinkki);
    }
    return linkit;
  }, [ensisijainenKaannettavaKieli, julkaisu.suunnittelumateriaali, toissijainenKaannettavaKieli]);

  const aineistoDefinitions: DefinitionList = useMemo(
    () => [
      {
        term: "Suunnitelmaluonnokset ja esittelyaineistot",
        definition: (
          <ContentSpacer gap={7}>
            {videolista.length && (
              <ContentSpacer gap={2}>
                <p>Videoesittely</p>
                <ContentSpacer as="ul" gap={2}>
                  {videolista.map((video, index) => (
                    <li key={index}>
                      <StyledLink sx={{ fontWeight: 400 }} href={video.url}>
                        {video.nimi || video.url}
                      </StyledLink>
                    </li>
                  ))}
                </ContentSpacer>
              </ContentSpacer>
            )}
            {julkaisu.esittelyaineistot?.length && (
              <ContentSpacer gap={2}>
                <p>Esittelyaineistot</p>
                <ContentSpacer as="ul" gap={2}>
                  {julkaisu.esittelyaineistot.map((aineisto) => (
                    <Fragment key={aineisto.dokumenttiOid}>
                      {aineisto.tiedosto && (
                        <li>
                          <StyledLink sx={{ fontWeight: 400 }} href={aineisto.tiedosto}>
                            {aineisto.nimi || aineisto.tiedosto}
                          </StyledLink>
                        </li>
                      )}
                    </Fragment>
                  ))}
                </ContentSpacer>
              </ContentSpacer>
            )}
            {julkaisu.suunnitelmaluonnokset?.length && (
              <ContentSpacer gap={2}>
                <p>Suunnitelmaluonnokset</p>
                <ContentSpacer as="ul" gap={2}>
                  {julkaisu.suunnitelmaluonnokset.map((aineisto) => (
                    <Fragment key={aineisto.dokumenttiOid}>
                      {aineisto.tiedosto && (
                        <li>
                          <StyledLink sx={{ fontWeight: 400 }} href={aineisto.tiedosto}>
                            {aineisto.nimi || aineisto.tiedosto}
                          </StyledLink>
                        </li>
                      )}
                    </Fragment>
                  ))}
                </ContentSpacer>
              </ContentSpacer>
            )}
            {materiaalilinkit.length && (
              <ContentSpacer gap={2}>
                <p>Muut esittelymateriaalit</p>
                <ContentSpacer as="ul" sx={{ ["& p"]: { marginBottom: 0 } }} gap={2}>
                  {materiaalilinkit.map((materiaalilinkki, index) => (
                    <li key={index}>
                      <p>{materiaalilinkki.nimi}</p>
                      <StyledLink sx={{ fontWeight: 400 }} href={materiaalilinkki.url}>
                        {materiaalilinkki.url}
                      </StyledLink>
                    </li>
                  ))}
                </ContentSpacer>
              </ContentSpacer>
            )}
          </ContentSpacer>
        ),
      },
    ],
    [julkaisu.esittelyaineistot, julkaisu.suunnitelmaluonnokset, materiaalilinkit, videolista]
  );
  return (
    <Section>
      <StyledDefinitionList definitions={aineistoDefinitions} />
    </Section>
  );
};
