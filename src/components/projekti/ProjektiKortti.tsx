import { Projekti } from "@services/api";
import React, { ReactElement } from "react";
import styles from "@styles/projekti/ProjektiSideNavigation.module.css";
import MuiAccordion, { AccordionProps, accordionClasses } from "@mui/material/Accordion";
import { Typography } from "@mui/material";
import AccordionSummary from "@mui/material/AccordionSummary";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExtLink from "@components/ExtLink";
import { styled } from "@mui/material/styles";
import { examineKuulutusPaiva } from "../../util/aloitusKuulutusUtil";

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
  const julkinen =
    props.projekti?.aloitusKuulutusJulkaisut?.[0] &&
    examineKuulutusPaiva(props.projekti.aloitusKuulutusJulkaisut[0]?.kuulutusPaiva).published;
  const julkinenURL =
    window.location.protocol + "//" + window.location.host + "/suunnitelma/" + props.projekti.oid + "/aloituskuulutus";

  return (
    <div role="navigation" className={styles["side-nav"]} style={{ marginBottom: "1rem" }}>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: "#0064AF" }} />}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          <img
            style={{ display: "inline", marginLeft: "1rem", marginRight: "1rem" }}
            src="/projektikortin-ikoni.svg"
            alt="maapallo"
          />
          {/* TODO: Poista placeholder kun asiatunnus saadaan velhosta varmasti, eika ole tyhja */}
          <Typography>VÄYLÄ/1234/xx.xx.xx/2022</Typography>
        </AccordionSummary>
        {julkinen && (
          <AccordionDetails>
            {/* TODO: vaihda kun saadaan projektin perusosoiteelle nakyma, tai ohjaamaan aktiiviseen vaiheeseen */}
            <ExtLink href={julkinenURL}>Suunnitelma julkisella puolella</ExtLink>
          </AccordionDetails>
        )}
      </Accordion>
    </div>
  );
}
