import React from "react";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import ProjektiPerustiedot from "@components/projekti/ProjektiPerustiedot";
import ExtLink from "@components/ExtLink";
import ProjektiKuntatiedot from "@components/projekti/ProjektiKuntatiedot";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { Stack } from "@mui/material";
import HassuGrid from "@components/HassuGrid";

interface Props {
  projekti: ProjektiLisatiedolla;
}

export default function ProjektinTiedotLukutila({ projekti }: Props) {
  const velhoURL = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-" + projekti.oid;

  return (
    <>
      <Section>
        <ProjektiPerustiedot projekti={projekti} />
        <Stack direction="column">
          {projekti?.velho?.linkki && <ExtLink href={projekti?.velho?.linkki}>Hankesivu</ExtLink>}
          <ExtLink href={velhoURL}>Projektin sivu Projektivelhossa</ExtLink>
        </Stack>
      </Section>
      <ProjektiKuntatiedot projekti={projekti} />
      <Section>
        <SectionContent>
          <h4 className="vayla-small-title">Projektin kuulutusten kielet</h4>
          <HassuGrid cols={{ lg: 3 }}>
            <div>
              <h5>Ensisijainen kieli</h5>
              {projekti.kielitiedot?.ensisijainenKieli}
            </div>
            <div>
              <h5>Toissijainen kieli</h5>
              {projekti.kielitiedot?.toissijainenKieli || "-"}
            </div>
          </HassuGrid>
        </SectionContent>
        <h5>Projektin nimi ruotsiksi</h5>
        <p>{projekti.kielitiedot?.projektinNimiVieraskielella}</p>
      </Section>
      <Section>
        <h4>Projektiin linkittyvät suunnitelmat</h4>
        <p>{projekti.liittyvatSuunnitelmat}</p>
      </Section>
      <Section>
        <SectionContent>
          <h4>Suunnittelusopimus</h4>
          {projekti.suunnitteluSopimus ? "Kyllä" : "Ei"}
        </SectionContent>
        <SectionContent>
          <h4>Kunnan projektipäällikön tiedot</h4>
          {projekti.suunnitteluSopimus?.yhteysHenkilo}
        </SectionContent>
      </Section>
      <Section smallGaps>
        <h4 className="vayla-small-title">EU-rahoitus</h4>
        <p>{projekti.euRahoitus ? "Kyllä" : "Ei"}</p>
      </Section>
      <Section smallGaps>
        <h4 className="vayla-small-title">Muistiinpanot</h4>
        <p>{projekti.muistiinpano}</p>
      </Section>
      <Section>
        <h2>Suunnitelman aktiivisuus</h2>
        <p>
          Projekti siirtyy suunnitelmassa vuoden päästä hyväksymispäätöksen kuulluttamisesta automaattisesti epäaktiivisiseen tilaan. Voit
          kuitenkin aikaistaa tai siirtää eteenpäin ajankohtaa, jolloin projekti siirtyy epäaktiiviseksi. Projekti voi siirtyä
          epäaktiiviseen tilaan aikaisintaan hyväksymispäätöksen kuulutusajan päättymistä seuraavana päivänä.
        </p>
        <p>
          Epäaktiivisessa tilassa projektin muokkausoikeudet poistuvat projektin jäseniltä ja projekti poistuu palvelun julkiselta puolelta.
          Voit pyytää suunnitelman epäaktiivisesta aktiiviseksi palauttamista järjestelmän pääkäyttäjältä.
        </p>
        <h3>Epäaktiivinen alkaen</h3>
        <p>x.x.xxx</p>
      </Section>
    </>
  );
}
