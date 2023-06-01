import React from "react";
import ProjektiPerustiedot from "./ProjektiPerustiedot";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import ProjektiKuntatiedot from "./ProjektiKuntatiedot";
import ProjektinLinkit from "./ProjektinLinkit";
import Section from "@components/layout/Section2";

export interface PerusosioProps {
  projekti: ProjektiLisatiedolla;
}

export default function ProjektinPerusosio({ projekti }: PerusosioProps) {
  return (
    <Section>
      <ProjektiPerustiedot projekti={projekti} />
      <ProjektiKuntatiedot projekti={projekti} />
      <ProjektinLinkit projekti={projekti} />
    </Section>
  );
}
