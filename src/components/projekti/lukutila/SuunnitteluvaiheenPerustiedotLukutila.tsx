import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import lowerCase from "lodash/lowerCase";
import { ReactElement } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import { PreWrapParagraph } from "@components/PreWrapParagraph";

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
      <Section>
        <h5 className="vayla-small-title">Hankkeen sisällönkuvaus</h5>
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
      <Section>
        <h5 className="vayla-small-title">Suunnittelun eteneminen ja arvio kestosta</h5>
        {ensisijainenKaannettavaKieli && (
          <SectionContent>
            <p className="vayla-label">
              Julkisella puolella esitettävä suunnittelun etenemisen kuvaus ensisijaisella kielellä (
              {lowerCase(ensisijainenKaannettavaKieli)}) *
            </p>
            <PreWrapParagraph>
              {projekti.vuorovaikutusKierros?.suunnittelunEteneminenJaKesto?.[ensisijainenKaannettavaKieli] || "- "}
            </PreWrapParagraph>
          </SectionContent>
        )}
        {toissijainenKaannettavaKieli && (
          <SectionContent largeGaps>
            <p className="vayla-label">
              Julkisella puolella esitettävä suunnittelun etenemisen kuvaus toissijaisella kielellä (
              {lowerCase(toissijainenKaannettavaKieli)})
            </p>
            <PreWrapParagraph>
              {projekti.vuorovaikutusKierros?.suunnittelunEteneminenJaKesto?.[toissijainenKaannettavaKieli] || "- "}
            </PreWrapParagraph>
          </SectionContent>
        )}
        {ensisijainenKaannettavaKieli && (
          <SectionContent>
            <p className="vayla-label">
              Arvio seuraavan vaiheen alkamisesta ensisijaisella kielellä ({lowerCase(ensisijainenKaannettavaKieli)}) *
            </p>
            <p>{projekti.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta?.[ensisijainenKaannettavaKieli] || "- "}</p>
          </SectionContent>
        )}
        {toissijainenKaannettavaKieli && (
          <SectionContent largeGaps>
            <p className="vayla-label">
              Arvio seuraavan vaiheen alkamisesta toissijaisella kielellä ({lowerCase(toissijainenKaannettavaKieli)})
            </p>
            <p>{projekti.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta?.[toissijainenKaannettavaKieli] || "- "}</p>
          </SectionContent>
        )}
      </Section>
    </>
  );
}
