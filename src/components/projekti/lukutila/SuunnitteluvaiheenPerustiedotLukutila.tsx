import SectionContent from "@components/layout/SectionContent";
import { Kieli } from "@services/api";
import Section from "@components/layout/Section";
import lowerCase from "lodash/lowerCase";
import { ReactElement } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";

export default function SuunnitteluvaiheenPerustiedotLukutila(): ReactElement {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  return <>{projekti && <SuunnitteluvaiheenPerustiedotLukutila2 projekti={projekti} />}</>;
}

type Props = {
  projekti: ProjektiLisatiedolla;
};

function SuunnitteluvaiheenPerustiedotLukutila2({ projekti }: Props): ReactElement {
  const kielitiedot = projekti.kielitiedot;
  const ensisijainenKieli = projekti.kielitiedot ? projekti.kielitiedot.ensisijainenKieli : Kieli.SUOMI;
  const toissijainenKieli = kielitiedot?.toissijainenKieli;

  return (
    <>
      <Section>
        <h5 className="vayla-small-title">Hankkeen sisällönkuvaus</h5>
        <SectionContent largeGaps>
          <p>Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä ({lowerCase(ensisijainenKieli)}) *</p>
          <p>{projekti.vuorovaikutusKierros?.hankkeenKuvaus?.[ensisijainenKieli]}</p>
        </SectionContent>
        {toissijainenKieli && (
          <SectionContent largeGaps>
            <p>Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä ({lowerCase(ensisijainenKieli)}) *</p>
            <p>{projekti.vuorovaikutusKierros?.hankkeenKuvaus?.[toissijainenKieli]}</p>
          </SectionContent>
        )}
      </Section>
      <Section>
        <h5 className="vayla-small-title">Suunnittelun eteneminen ja arvio kestosta</h5>

        <SectionContent>
          <p>Julkisella puolella esitettävä suunnittelun etenemisen kuvaus</p>
          <p>{projekti.vuorovaikutusKierros?.suunnittelunEteneminenJaKesto || "- "}</p>
        </SectionContent>
        <SectionContent>
          <p>Arvio seuraavan vaiheen alkamisesta</p>
          <p>{projekti.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta}</p>
        </SectionContent>
      </Section>
    </>
  );
}
