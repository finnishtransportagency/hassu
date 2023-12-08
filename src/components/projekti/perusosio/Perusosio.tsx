import React from "react";
import ProjektiPerustiedot from "./ProjektiPerustiedot";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import ProjektiKuntatiedot from "./ProjektiKuntatiedot";
import ProjektinLinkit from "./ProjektinLinkit";
import Section from "@components/layout/Section2";
import { KarttaKansalaiselle } from "../common/KarttaKansalaiselle";
import { H5 } from "@components/Headings";

export interface PerusosioProps {
  projekti: ProjektiLisatiedolla;
}

export default function ProjektinPerusosio({ projekti }: PerusosioProps) {
  return (
    <>
      <Section>
        <ProjektiPerustiedot projekti={projekti} />
        <ProjektinLinkit projekti={projekti} />
      </Section>
      <Section>
        <ProjektiKuntatiedot projekti={projekti} />
        <H5>Projekti kartalla</H5>
        <KarttaKansalaiselle geoJSON={projekti.velho.geoJSON} />
      </Section>
    </>
  );
}
