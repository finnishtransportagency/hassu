import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import lowerCase from "lodash/lowerCase";
import { ReactElement } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import { PreWrapParagraph } from "@components/PreWrapParagraph";
import { Link } from "@mui/material";

export default function SuunnitteluvaiheenPerustiedotLukutila(): ReactElement {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  return <>{projekti && <SuunnitteluvaiheenPerustiedotLukutila2 projekti={projekti} />}</>;
}

type Props = {
  projekti: ProjektiLisatiedolla;
};

function SuunnitteluvaiheenPerustiedotLukutila2({ projekti }: Props): ReactElement {
  const kielitiedot = projekti.kielitiedot;
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
              Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä ({lowerCase(ensisijainenKaannettavaKieli)}) *
            </p>
            <PreWrapParagraph>{projekti.vuorovaikutusKierros?.hankkeenKuvaus?.[ensisijainenKaannettavaKieli]}</PreWrapParagraph>
          </SectionContent>
        )}
        {toissijainenKaannettavaKieli && (
          <SectionContent largeGaps>
            <p className="vayla-label">
              Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä ({lowerCase(toissijainenKaannettavaKieli)}) *
            </p>
            <PreWrapParagraph>{projekti.vuorovaikutusKierros?.hankkeenKuvaus?.[toissijainenKaannettavaKieli]}</PreWrapParagraph>
          </SectionContent>
        )}
      </Section>
      <Section noDivider>
        {ensisijainenKaannettavaKieli && (
          <SectionContent>
            <p className="vayla-label">
              Julkisella puolella esitettävä suunnittelun etenemisen kuvaus{" "}
              {toissijainenKaannettavaKieli && `(${lowerCase(ensisijainenKaannettavaKieli)}) `}*
            </p>
            <PreWrapParagraph>
              {projekti.vuorovaikutusKierros?.suunnittelunEteneminenJaKesto?.[ensisijainenKaannettavaKieli] || "- "}
            </PreWrapParagraph>
          </SectionContent>
        )}
        {toissijainenKaannettavaKieli && (
          <SectionContent largeGaps>
            <p className="vayla-label">
              Julkisella puolella esitettävä suunnittelun etenemisen kuvaus ({lowerCase(toissijainenKaannettavaKieli)}) *
            </p>
            <PreWrapParagraph>
              {projekti.vuorovaikutusKierros?.suunnittelunEteneminenJaKesto?.[toissijainenKaannettavaKieli] || "- "}
            </PreWrapParagraph>
          </SectionContent>
        )}
      </Section>
      <Section>
        {ensisijainenKaannettavaKieli && (
          <SectionContent>
            <p className="vayla-label">
              Arvio seuraavan vaiheen alkamisesta {toissijainenKaannettavaKieli && `(${lowerCase(ensisijainenKaannettavaKieli)}) `}*
            </p>
            <p>{projekti.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta?.[ensisijainenKaannettavaKieli] || "- "}</p>
          </SectionContent>
        )}
        {toissijainenKaannettavaKieli && (
          <SectionContent largeGaps>
            <p className="vayla-label">Arvio seuraavan vaiheen alkamisesta ({lowerCase(toissijainenKaannettavaKieli)}) *</p>
            <p>{projekti.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta?.[toissijainenKaannettavaKieli] || "- "}</p>
          </SectionContent>
        )}
      </Section>
      {projekti.vuorovaikutusKierros && (
        <Section>
          <SectionContent>
            <p className="vayla-label">Videoesittely</p>
            {!!projekti.vuorovaikutusKierros?.videot?.length && projekti.vuorovaikutusKierros.videot[0].SUOMI.url ? (
              projekti.vuorovaikutusKierros.videot.map((video) => (
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
            {!!projekti.vuorovaikutusKierros?.esittelyaineistot?.length ? (
              projekti.vuorovaikutusKierros.esittelyaineistot.map((aineisto) => (
                <div key={aineisto.dokumenttiOid} style={{ marginTop: "0.4rem" }}>
                  <Link underline="none" href={aineisto.tiedosto || "#"}>
                    {aineisto.nimi}
                  </Link>
                </div>
              ))
            ) : (
              <p>-</p>
            )}
          </SectionContent>
          <SectionContent>
            <p className="vayla-label">Suunnitelmaluonnokset</p>
            {!!projekti.vuorovaikutusKierros?.suunnitelmaluonnokset?.length ? (
              projekti.vuorovaikutusKierros.suunnitelmaluonnokset.map((aineisto) => (
                <div key={aineisto.dokumenttiOid} style={{ marginTop: "0.4rem" }}>
                  <Link underline="none" href={aineisto.tiedosto || "#"}>
                    {aineisto.nimi}
                  </Link>
                </div>
              ))
            ) : (
              <p>-</p>
            )}
          </SectionContent>

          <SectionContent>
            <p className="vayla-label">Muu esittelymateriaali</p>
            {projekti.vuorovaikutusKierros?.suunnittelumateriaali?.map((link) => {
              <>
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
              </>;
            })}
          </SectionContent>
        </Section>
      )}
    </>
  );
}
