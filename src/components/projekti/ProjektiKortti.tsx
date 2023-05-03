import { KuulutusJulkaisuTila, Projekti } from "@services/api";
import React, { ReactElement } from "react";
import MuiAccordion, { accordionClasses, AccordionProps } from "@mui/material/Accordion";
import { Typography } from "@mui/material";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ExtLink from "@components/ExtLink";
import { styled } from "@mui/material/styles";
import { examineKuulutusPaiva } from "../../util/aloitusKuulutusUtil";
import getAsiatunnus from "src/util/getAsiatunnus";

const Accordion = styled((props: AccordionProps) => <MuiAccordion disableGutters elevation={0} square {...props} />)({
  paddingTop: "0.5rem",
  paddingBottom: "0.5rem",
  [`&.${accordionClasses.root}`]: {
    backgroundColor: "#F8F8F8",
  },
});

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(3),
  paddingRight: 0,
  marginLeft: "3.5rem",
}));

interface Props {
  projekti: Projekti;
}

export default function ProjektiKortti(props: Props): ReactElement {
  const julkinen = examineKuulutusPaiva(props.projekti.aloitusKuulutusJulkaisu?.kuulutusPaiva).published;
  const migroitu = props.projekti.aloitusKuulutusJulkaisu?.tila == KuulutusJulkaisuTila.MIGROITU;
  const julkinenURL = window.location.protocol + "//" + window.location.host + "/suunnitelma/" + props.projekti.oid;
  const asiatunnus = getAsiatunnus(props.projekti) || "-/0000/00.00.00/0000";
  const nimi = props.projekti.velho.nimi;

  return (
    <div role="navigation" className="bg-gray-lightest" style={{ marginBottom: "1em", paddingTop: "1.2em", paddingBottom: "1.2em" }}>
      <img style={{ display: "inline", marginLeft: "1rem", marginRight: "1rem" }} src="/projektikortin-ikoni.svg" alt="maapallo" />
      {nimi}

      <div style={{ marginLeft: "3.5rem", marginRight: "1rem" }}>
        <Typography>{asiatunnus}</Typography>

        {(julkinen || migroitu) && <ExtLink href={julkinenURL}>Siirry kansalaisnäkymään</ExtLink>}
      </div>
    </div>
  );
}
