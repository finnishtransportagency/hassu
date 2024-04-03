import React from "react";
import ProjektiPerustiedot from "./ProjektiPerustiedot";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import ProjektiKuntatiedot from "./ProjektiKuntatiedot";
import ProjektinLinkit from "./ProjektinLinkit";
import Section from "@components/layout/Section2";
import { KarttaKansalaiselle } from "../common/KarttaKansalaiselle";
import { H5 } from "@components/Headings";
import ContentSpacer from "@components/layout/ContentSpacer";
import TextInput from "@components/form/TextInput";
import { FormState, UseFormRegister } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";

export interface PerusosioProps {
  projekti: ProjektiLisatiedolla;
}

interface ProjektinPerusosioProps extends PerusosioProps {
  register: UseFormRegister<FormValues>;
  formState: FormState<FormValues>;
}

export default function ProjektinPerusosio({ projekti, register, formState }: ProjektinPerusosioProps) {
  return (
    <>
      <Section>
        <ProjektiPerustiedot projekti={projekti} />
        <ProjektinLinkit projekti={projekti} />
      </Section>
      <Section>
        <ProjektiKuntatiedot projekti={projekti} />
        <ContentSpacer>
          <H5>Projekti kartalla</H5>
          <KarttaKansalaiselle geoJSON={projekti.velho.geoJSON} />
        </ContentSpacer>
      </Section>
      <Section gap={4}>
        <h4 className="vayla-small-title">Projektin viitetieto</h4>
        <p>
          Tämä tieto on Suomi.fi tulostus-, jakelu- ja kuoritus -palvelun laskutusta varten. Väylän projektissa projektikohtainen VSK-koodi.
          ELYn projektissa oman ohjeistuksensa mukaisen viitetiedon. HUOM! Hyväksymisesityksen laskutustiedot annetaan erikseen.
        </p>
        <TextInput
          label="Projektin viitetieto *"
          maxLength={15}
          {...register("kustannuspaikka")}
          error={formState.errors.kustannuspaikka}
        />
      </Section>
    </>
  );
}
