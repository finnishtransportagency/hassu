import React, { ReactElement } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { useRouter } from "next/router";
import SectionContent from "@components/layout/SectionContent";

export default function Suunnittelu(): ReactElement {
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti } = useProjektiJulkinen(oid);

  return (
    <ProjektiJulkinenPageLayout selectedStep={1} title="Tutustu hankkeeseen ja vuorovaikuta">
      <>
        <Section>
          <SectionContent>
            <h5 className="vayla-small-title">Suunnitteluhankkeen kuvaus</h5>
            <p>{projekti?.suunnitteluVaihe?.hankkeenKuvaus?.SUOMI}</p>
          </SectionContent>
          <SectionContent>
            <h5 className="vayla-small-title">Suunnittelun eteneminen</h5>
            <p>{projekti?.suunnitteluVaihe?.suunnittelunEteneminenJaKesto}</p>
          </SectionContent>
          <SectionContent>
            <h5 className="vayla-small-title">Arvio seuraavan vaiheen alkamisesta</h5>
            <p>{projekti?.suunnitteluVaihe?.arvioSeuraavanVaiheenAlkamisesta}</p>
          </SectionContent>
        </Section>
        <Section>
          <SectionContent>
            <h5 className="vayla-small-title">Osallistumisen ja vaikuttamisen mahdollisuudet ja aikataulut</h5>
            <p>
              Voit osallistua vuorovaikutustilaisuuksiin, tutustua suunnittelu- ja esittelyaineistoihin sekä jättää
              palautteen tai kysyä hankkeesta. Osallistumalla sinulla on mahdollisuus vaikuttaa hankkeen suunnitteluun.
              Suunnitelmaluonnokset ja esittelyaineistot ovat tutustuttavissa xx.xx.xxxx asti. Siirry aineistoihin.
              Kysymykset ja palautteet toivotaan esitettävän xx.xx.xxxx mennessä. Siirry lomakkeelle.
            </p>
          </SectionContent>
        </Section>
      </>
    </ProjektiJulkinenPageLayout>
  );
}
