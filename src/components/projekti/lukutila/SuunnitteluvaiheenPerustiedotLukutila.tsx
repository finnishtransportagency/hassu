import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import React, { ReactElement } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { getKaannettavatKielet } from "hassu-common/kaannettavatKielet";
import { PreWrapParagraph } from "@components/PreWrapParagraph";
import { Link, styled } from "@mui/material";
import { label } from "src/util/textUtil";
import SaapuneetKysymyksetJaPalautteet from "../suunnitteluvaihe/SaapuneetKysymyksetJaPalautteet";
import { Aineisto, AineistoTila } from "@services/api";
import { FILE_PATH_DELETED_PREFIX } from "common/links";

export default function SuunnitteluvaiheenPerustiedotLukutila(): ReactElement {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  return <>{projekti && <SuunnitteluvaiheenPerustiedotLukutila2 projekti={projekti} />}</>;
}

type Props = {
  projekti: ProjektiLisatiedolla;
};

function SuunnitteluvaiheenPerustiedotLukutila2({ projekti }: Readonly<Props>): ReactElement {
  const kielitiedot = projekti.kielitiedot;
  if (!kielitiedot) {
    return <></>;
  }

  const viimeisinJulkaisu = projekti?.vuorovaikutusKierrosJulkaisut?.[projekti.vuorovaikutusKierrosJulkaisut?.length - 1];
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  return (
    <>
      <Section noDivider>
        <h5 className="vayla-title mt-12">Suunnitteluvaiheen perustiedot</h5>
      </Section>
      <Section noDivider>
        {ensisijainenKaannettavaKieli && (
          <SectionContent largeGaps>
            <p className="vayla-label">
              {label({
                label: `Tiivistetty hankkeen sisällön kuvaus`,
                inputLanguage: ensisijainenKaannettavaKieli,
                kielitiedot,
                required: true,
              })}
            </p>
            <PreWrapParagraph>{viimeisinJulkaisu?.hankkeenKuvaus?.[ensisijainenKaannettavaKieli]}</PreWrapParagraph>
          </SectionContent>
        )}
        {toissijainenKaannettavaKieli && (
          <SectionContent largeGaps>
            <p className="vayla-label">
              {label({
                label: `Tiivistetty hankkeen sisällön kuvaus`,
                inputLanguage: toissijainenKaannettavaKieli,
                kielitiedot,
                required: true,
              })}
            </p>
            <PreWrapParagraph>{viimeisinJulkaisu?.hankkeenKuvaus?.[toissijainenKaannettavaKieli]}</PreWrapParagraph>
          </SectionContent>
        )}
      </Section>
      <Section noDivider>
        {ensisijainenKaannettavaKieli && (
          <SectionContent>
            <p className="vayla-label">
              {label({
                label: `Julkisella puolella esitettävä suunnittelun etenemisen kuvaus`,
                inputLanguage: ensisijainenKaannettavaKieli,
                kielitiedot,
                required: true,
              })}
            </p>
            <PreWrapParagraph>{viimeisinJulkaisu?.suunnittelunEteneminenJaKesto?.[ensisijainenKaannettavaKieli] || "- "}</PreWrapParagraph>
          </SectionContent>
        )}
        {toissijainenKaannettavaKieli && (
          <SectionContent largeGaps>
            <p className="vayla-label">
              {label({
                label: `Julkisella puolella esitettävä suunnittelun etenemisen kuvaus`,
                inputLanguage: toissijainenKaannettavaKieli,
                kielitiedot,
                required: true,
              })}
            </p>
            <PreWrapParagraph>{viimeisinJulkaisu?.suunnittelunEteneminenJaKesto?.[toissijainenKaannettavaKieli] || "- "}</PreWrapParagraph>
          </SectionContent>
        )}
      </Section>
      <Section>
        {ensisijainenKaannettavaKieli && (
          <SectionContent>
            <p className="vayla-label">
              {label({
                label: `Arvio seuraavan vaiheen alkamisesta`,
                inputLanguage: ensisijainenKaannettavaKieli,
                kielitiedot,
                required: true,
              })}
            </p>
            <p>{viimeisinJulkaisu?.arvioSeuraavanVaiheenAlkamisesta?.[ensisijainenKaannettavaKieli] || "- "}</p>
          </SectionContent>
        )}
        {toissijainenKaannettavaKieli && (
          <SectionContent largeGaps>
            <p className="vayla-label">
              {label({
                label: `Arvio seuraavan vaiheen alkamisesta`,
                inputLanguage: toissijainenKaannettavaKieli,
                kielitiedot,
                required: true,
              })}
            </p>
            <p>{viimeisinJulkaisu?.arvioSeuraavanVaiheenAlkamisesta?.[toissijainenKaannettavaKieli] || "- "}</p>
          </SectionContent>
        )}
      </Section>
      {viimeisinJulkaisu && (
        <>
          <Section>
            <SectionContent>
              <p className="vayla-label">Videoesittely</p>
              {!!viimeisinJulkaisu?.videot?.length && viimeisinJulkaisu.videot[0].SUOMI.url ? (
                viimeisinJulkaisu.videot.map((video) => (
                  <>
                    {ensisijainenKaannettavaKieli && (
                      <div key={video?.[ensisijainenKaannettavaKieli]?.url} style={{ marginTop: "0.4rem" }}>
                        <Link underline="none" href={video?.[ensisijainenKaannettavaKieli]?.url}>
                          {video?.[ensisijainenKaannettavaKieli]?.url}
                        </Link>
                      </div>
                    )}

                    {toissijainenKaannettavaKieli && (
                      <div key={video?.[toissijainenKaannettavaKieli]?.url} style={{ marginTop: "0.4rem" }}>
                        <Link underline="none" href={video?.[toissijainenKaannettavaKieli]?.url}>
                          {video?.[toissijainenKaannettavaKieli]?.url}
                        </Link>
                      </div>
                    )}
                  </>
                ))
              ) : (
                <p>-</p>
              )}
            </SectionContent>

            <SectionContent>
              <p className="vayla-label">Esittelyaineistot</p>
              <AineistoList aineistot={viimeisinJulkaisu.esittelyaineistot} />
            </SectionContent>
            <SectionContent>
              <p className="vayla-label">Suunnitelmaluonnokset</p>
              <AineistoList aineistot={viimeisinJulkaisu.suunnitelmaluonnokset} />
            </SectionContent>

            <SectionContent>
              <p className="vayla-label">Muu esittelymateriaali</p>
              {ensisijainenKaannettavaKieli &&
                viimeisinJulkaisu?.suunnittelumateriaali?.map((link) => (
                  <React.Fragment key={link[ensisijainenKaannettavaKieli]?.nimi}>
                    {ensisijainenKaannettavaKieli && link[ensisijainenKaannettavaKieli]?.nimi ? (
                      <>
                        <div style={{ marginTop: "0.4rem" }}>{link[ensisijainenKaannettavaKieli]?.nimi}</div>
                        <div style={{ marginTop: "0.4rem" }}>
                          <Link underline="none" href={link[ensisijainenKaannettavaKieli]?.url}>
                            {link[ensisijainenKaannettavaKieli]?.url}
                          </Link>
                        </div>
                      </>
                    ) : (
                      <p>-</p>
                    )}
                    {toissijainenKaannettavaKieli &&
                      (link[toissijainenKaannettavaKieli]?.nimi ? (
                        <>
                          <div style={{ marginTop: "0.4rem" }}>{link[toissijainenKaannettavaKieli]?.nimi}</div>
                          <div style={{ marginTop: "0.4rem" }}>
                            <Link underline="none" href={link[toissijainenKaannettavaKieli]?.url}>
                              {link[toissijainenKaannettavaKieli]?.url}
                            </Link>
                          </div>
                        </>
                      ) : (
                        <p>-</p>
                      ))}
                  </React.Fragment>
                ))}
            </SectionContent>
          </Section>
          <SaapuneetKysymyksetJaPalautteet projekti={projekti} lukutila={true} />
        </>
      )}
    </>
  );
}
function AineistoList(props: { aineistot: Aineisto[] | null | undefined }) {
  if (!props.aineistot?.length) {
    return <p>-</p>;
  }
  return (
    <StyledList>
      {props.aineistot.map((aineisto) => (
        <AineistoListElement key={aineisto.dokumenttiOid} aineisto={aineisto} />
      ))}
    </StyledList>
  );
}

const StyledList = styled("ul")({ "& > li": { marginTop: "0.4rem" } });

function AineistoListElement(props: { aineisto: Aineisto }) {
  const shouldShowHref =
    props.aineisto.tiedosto &&
    !props.aineisto.tiedosto.startsWith(FILE_PATH_DELETED_PREFIX) &&
    props.aineisto.tila !== AineistoTila.POISTETTU;

  const href = shouldShowHref ? props.aineisto.tiedosto || undefined : undefined;

  if (!href) {
    return <li>{props.aineisto.nimi}</li>;
  }

  return (
    <li>
      <Link underline="none" href={href}>
        {props.aineisto.nimi}
      </Link>
    </li>
  );
}
