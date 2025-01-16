import React, { ReactElement } from "react";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { ProjektinJakotieto } from "@services/api";
import { H3 } from "../Headings";
import { ExternalStyledLink } from "@components/StyledLink";
import { styled } from "@mui/system";

interface Props {
  jakotieto: ProjektinJakotieto;
}

export default function SuunnitelmaJaettuOsiin({ jakotieto }: Readonly<Props>): ReactElement {
  return (
    <Section smallGaps>
      <H3>Suunnitelma jaettu osiin</H3>
      <SectionContent>
        <List>
          <li key={jakotieto.oid}>
            <ExternalStyledLink target="_blank" href={{ pathname: "/yllapito/projekti/[oid]", query: { oid: jakotieto.oid } }}>
              {jakotieto.nimi.SUOMI}
            </ExternalStyledLink>
          </li>
        </List>
      </SectionContent>
    </Section>
  );
}

const List = styled("ul")(({ theme }) => ({
  listStylePosition: "inside",
  marginLeft: theme.spacing(4),
  "& > li": {
    "& > p,a": {
      marginLeft: theme.spacing(1),
      display: "inline-block",
      marginBottom: "0px",
    },
    "&:not(:last-child)": {
      marginBottom: theme.spacing(1),
    },
  },
}));
