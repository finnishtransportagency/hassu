import React, { ReactElement } from "react";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { ProjektinJakotieto } from "@services/api";
import { H3 } from "../Headings";
import { ExternalStyledLink } from "@components/StyledLink";

interface Props {
  projektinJakotiedot: ProjektinJakotieto[];
}

export default function SuunnitelmaJaettuOsiin({ projektinJakotiedot }: Readonly<Props>): ReactElement {
  return (
    <Section smallGaps>
      <H3>Suunnitelma jaettu osiin</H3>
      <SectionContent>
        {projektinJakotiedot.map((jakotieto) => (
          <ExternalStyledLink
            key={jakotieto.oid}
            target="_blank"
            href={{ pathname: "/yllapito/projekti/[oid]", query: { oid: jakotieto.oid } }}
          >
            {jakotieto.nimi.SUOMI}
          </ExternalStyledLink>
        ))}
      </SectionContent>
    </Section>
  );
}
