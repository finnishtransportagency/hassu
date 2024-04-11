import React from "react";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuGrid from "@components/HassuGrid";
import lowerCase from "lodash/lowerCase";
import ProjektinPerusosio from "../perusosio/Perusosio";
import LinkitetytProjektit from "../LinkitetytProjektit";

interface Props {
  projekti: ProjektiLisatiedolla;
}

export default function ProjektinTiedotLukutila({ projekti }: Props) {
  return (
    <>
      <ProjektinPerusosio projekti={projekti} lukutila={true} />
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
      <LinkitetytProjektit projekti={projekti}></LinkitetytProjektit>
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
    </>
  );
}
