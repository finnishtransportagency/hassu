import React from "react";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import ProjektiPerustiedot from "@components/projekti/ProjektiPerustiedot";
import ExtLink from "@components/ExtLink";
import ProjektiKuntatiedot from "@components/projekti/ProjektiKuntatiedot";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { Stack } from "@mui/material";
import HassuGrid from "@components/HassuGrid";
import lowerCase from "lodash/lowerCase";

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
          <p className="vayla-label">Projektin kuulutusten kielet</p>
          <HassuGrid cols={{ lg: 3 }}>
            <div>
              <h5 style={{ fontWeight: "bold" }}>Ensisijainen kieli</h5>
              {lowerCase(projekti.kielitiedot?.ensisijainenKieli)}
            </div>
            {projekti.kielitiedot?.toissijainenKieli && (
              <div>
                <h5 style={{ fontWeight: "bold" }}>Toissijainen kieli</h5>
                {lowerCase(projekti.kielitiedot.toissijainenKieli)}
              </div>
            )}
          </HassuGrid>
        </SectionContent>
        {projekti.kielitiedot?.projektinNimiVieraskielella && (
          <div>
            <p className="vayla-label">Projektin nimi ruotsiksi</p>
            <p>{projekti.kielitiedot.projektinNimiVieraskielella}</p>
          </div>
        )}
      </Section>
      <Section>
        <p className="vayla-label">Projektiin linkittyvät suunnitelmat</p>
        {projekti.liittyvatSuunnitelmat?.map((suunnitelma) => (
          <p key={suunnitelma.asiatunnus}>{suunnitelma.asiatunnus}</p>
        ))}
        {(!projekti.liittyvatSuunnitelmat || projekti.liittyvatSuunnitelmat.length === 0) && <p>-</p>}
      </Section>
      <Section>
        <SectionContent>
          <p className="vayla-label">Suunnittelusopimus</p>
          <p>{projekti.suunnitteluSopimus ? "Kyllä" : "Ei"}</p>
        </SectionContent>
        <SectionContent>
          <p className="vayla-label">Kunnan edustajan tiedot</p>
          <p>{projekti.suunnitteluSopimus?.yhteysHenkilo}</p>
        </SectionContent>
      </Section>
      <Section smallGaps>
        <p className="vayla-label">EU-rahoitus</p>
        <p>{projekti.euRahoitus ? "Kyllä" : "Ei"}</p>
      </Section>
      <Section smallGaps>
        <p className="vayla-label">Muistiinpanot</p>
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
