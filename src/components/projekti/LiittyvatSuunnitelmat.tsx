import React from "react";
import Section from "@components/layout/Section2";
import ContentSpacer from "@components/layout/ContentSpacer";
import { Heading, HeadingLevel } from "../Headings";
import { ProjektinJakotieto } from "@services/api";
import { ExternalStyledLink } from "@components/StyledLink";

type Props = {
  jakotieto: ProjektinJakotieto | undefined | null;
  heading?: HeadingLevel;
};

export function LiittyvatSuunnitelmat({ jakotieto, heading = "h3" }: Props) {
  if (!jakotieto) {
    return <></>;
  }

  return (
    <Section>
      <ContentSpacer>
        <Heading component={heading} variant={heading}>
          Liittyvät suunnitelmat
        </Heading>
        <p>
          {"Tämä suunnitelma on jaettu kahteen osaan: "}
          <ExternalStyledLink target="_blank" href={{ pathname: "/yllapito/projekti/[oid]", query: { oid: jakotieto.oid } }}>
            {jakotieto.nimi.SUOMI}
          </ExternalStyledLink>
        </p>
      </ContentSpacer>
    </Section>
  );
}
