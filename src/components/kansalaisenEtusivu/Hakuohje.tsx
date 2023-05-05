import React, { ComponentProps } from "react";
import styles from "@styles/kansalaisenEtusivu/EtusivuJulkinenSideNavigation.module.css";
import Section from "@components/layout/Section";
import { styled } from "@mui/material";
import useTranslation from "next-translate/useTranslation";
import MuiAccordion, { accordionClasses, AccordionProps } from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const Hakuohje = styled((props) => {
  const { t } = useTranslation("etusivu");
  const Accordion = styled((props: AccordionProps) => <MuiAccordion disableGutters elevation={0} square {...props} />)({
    paddingTop: "0.5rem",
    paddingBottom: "0.5rem",
    [`&.${accordionClasses.root}`]: {
      backgroundColor: "#F8F8F8",
    },
  });

  const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
    paddingTop: theme.spacing(5),
    paddingBottom: theme.spacing(3),
    paddingRight: 0,
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
            height: "60px",
            backgroundColor: "#0064AF",
            color: "white",
            alignItems: "center",
            fontWeight: "700",
            paddingLeft: 24,
          }}
        >
          <h4 className="widget-title mb-0">{t(`hakuohje-otsikko`)}</h4>
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
})<ComponentProps<typeof Section>>({});

export default Hakuohje;
