import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import lowerCase from "lodash/lowerCase";
import { ReactElement } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import { PreWrapParagraph } from "@components/PreWrapParagraph";
import LukutilaLuonnoksetJaAineistot from "../suunnitteluvaihe/LuonnoksetJaAineistot/Lukutila";

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
        <LukutilaLuonnoksetJaAineistot vuorovaikutus={projekti.vuorovaikutusKierros} kielitiedot={kielitiedot} />
      )}
    </>
  );
}
