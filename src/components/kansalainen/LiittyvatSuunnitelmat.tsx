import React from "react";
import useTranslation from "next-translate/useTranslation";
import { Kieli, ProjektinJakotieto } from "hassu-common/graphql/apiModel";
import ContentSpacer from "@components/layout/ContentSpacer";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import { H3 } from "@components/Headings";
import { ExternalStyledLink } from "@components/StyledLink";
import { styled } from "@mui/system";

export function LiittyvatSuunnitelmat({ suunnitelmaJaettu }: { suunnitelmaJaettu: ProjektinJakotieto[] }) {
  const { t } = useTranslation("projekti");
  const kieli = useKansalaiskieli();

  return (
    <ContentSpacer>
      <H3 variant="h4">{t(`liittyvat_suunnitelmat.title`)}</H3>
      <p>{t("liittyvat_suunnitelmat.kuulutettu_yhdessa", { count: suunnitelmaJaettu.length })}</p>
      <List>
        {suunnitelmaJaettu.map((jakotieto) => (
          <li key={jakotieto.oid}>
            {jakotieto.julkinen ? (
              <ExternalStyledLink href={{ pathname: "/suunnitelma/[oid]", query: { oid: jakotieto.oid } }}>
                {jakotieto.nimi[kieli] ?? jakotieto.nimi[Kieli.SUOMI]}
              </ExternalStyledLink>
            ) : (
              // Fallback kielenä Suomi
              <p>{`${jakotieto.nimi[kieli] ?? jakotieto.nimi[Kieli.SUOMI]} (${t("liittyvat_suunnitelmat.ei_julkaisuja")})`}</p>
            )}
          </li>
        ))}
      </List>
    </ContentSpacer>
  );
}

const List = styled("ul")(({ theme }) => ({
  listStylePosition: "inside",
  listStyleType: "'-'",
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
