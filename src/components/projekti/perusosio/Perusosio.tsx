import React from "react";
import ProjektiPerustiedot from "./ProjektiPerustiedot";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import ProjektiKuntatiedot from "./ProjektiKuntatiedot";
import ProjektinLinkit from "./ProjektinLinkit";
import Section from "@components/layout/Section2";
import { KarttaKansalaiselle } from "../common/KarttaKansalaiselle";
import ContentSpacer from "@components/layout/ContentSpacer";
import TextInput from "@components/form/TextInput";
import { FormState, UseFormRegister } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import SectionContent from "@components/layout/SectionContent";

export interface PerusosioProps {
  projekti: ProjektiLisatiedolla;
}

interface ProjektinPerusosioProps extends PerusosioProps {
  register?: UseFormRegister<FormValues>;
  formState?: FormState<FormValues>;
  lukutila?: boolean;
}

export default function ProjektinPerusosio({ projekti, register, formState, lukutila }: Readonly<ProjektinPerusosioProps>) {
  return (
    <>
      <Section>
        <ProjektiPerustiedot projekti={projekti} />
        <ProjektinLinkit projekti={projekti} />
      </Section>
      <Section>
        <ProjektiKuntatiedot projekti={projekti} />
        <ContentSpacer>
          <h4 className="vayla-smallest-title">Projekti kartalla</h4>
          <KarttaKansalaiselle geoJSON={projekti.velho.geoJSON} />
        </ContentSpacer>
      </Section>
      {register && formState && (
        <Section gap={4}>
          <h3 className="vayla-subtitle">Projektin viitetieto</h3>
          <p>
            Tämä tieto on Suomi.fi-viestien tulostus-, kuoritus- ja jakelupalvelun laskutusta varten. Väylän projektissa projektikohtainen
            VSK-koodi. ELYn projektissa käytetään oman ohjeistuksen mukaista viitetietoa. Viitetiedon maksimipituus on 15 merkkiä ja se voi
            sisältää vain isoja kirjaimia ja numeroita. HUOM! Hyväksymisesityksen mukana Traficomiin toimitettavat laskutustiedot annetaan
            sivulla Hyväksymisesitys.
          </p>
          <TextInput
            label="Projektin viitetieto *"
            maxLength={15}
            {...register("kustannuspaikka")}
            error={formState.errors.kustannuspaikka}
          />
        </Section>
      )}
      {lukutila && (
        <Section gap={4}>
          <h4 className="vayla-small-title">Projektin viitetieto</h4>
          <SectionContent>
            <p>{projekti.kustannuspaikka ?? ""}</p>
          </SectionContent>
        </Section>
      )}
    </>
  );
}
