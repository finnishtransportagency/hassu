import React from "react";
import styles from "@styles/kansalaisenEtusivu/EtusivuJulkinenSideNavigation.module.css";
import { styled } from "@mui/material";
import useTranslation from "next-translate/useTranslation";
import MuiAccordion, { accordionClasses, AccordionProps } from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const Hakuohje = () => {
  const { t } = useTranslation("etusivu");
  const Accordion = styled((props: AccordionProps) => <MuiAccordion disableGutters elevation={0} square {...props} />)({
    [`&.${accordionClasses.root}`]: {
      backgroundColor: "white",
    },
    border: "#dfdfdf 2px solid",
  });

  const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(3),
    paddingRight: theme.spacing(3),
    marginLeft: "1rem",
  }));

  return (
    <div role="navigation" className={styles["side-nav"]}>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: "white" }} />}
          aria-controls="panel1a-content"
          id="panel1a-header"
          style={{
            height: "48px",
            backgroundColor: "#0064AF",
            color: "white",
            alignItems: "center",
            fontWeight: "700",
            paddingLeft: 24,
          }}
        >
          <h2 className={styles["search-guide-title"]}>{t(`hakuohje-otsikko`)}</h2>
        </AccordionSummary>
        <AccordionDetails>
          <p>{t(`hakuohje1`)}</p>
          <p>{t(`hakuohje2`)}</p>
          <p>{t(`hakuohje3`)}</p>
          <p>{t(`hakuohje4`)}</p>
        </AccordionDetails>
      </Accordion>
    </div>
  );
};

export default Hakuohje;
