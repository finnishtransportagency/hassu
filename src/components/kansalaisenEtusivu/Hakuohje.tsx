import React from "react";
import { styled, useMediaQuery } from "@mui/material";
import useTranslation from "next-translate/useTranslation";
import MuiAccordion, { accordionClasses, AccordionProps } from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTheme } from "@mui/material/styles";
import { focusStyleSecondary } from "@components/layout/HassuMuiThemeProvider";
import { H2 } from "@components/Headings";

const Hakuohje = () => {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("lg"));
  const { t } = useTranslation("etusivu");
  const Accordion = styled((props: AccordionProps) => <MuiAccordion disableGutters elevation={0} square {...props} />)({
    [`&.${accordionClasses.root}`]: {
      backgroundColor: "white",
    },
  });

  const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(3),
    paddingRight: theme.spacing(3),
    marginLeft: "1rem",
  }));

  return (
    <div role="navigation">
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: "white" }} />}
          aria-controls="search-guidance-content"
          id="search-guidance-header"
          sx={{
            height: desktop ? "48px" : "64px",
            backgroundColor: "#0064AF",
            color: "white",
            alignItems: "center",
            fontWeight: "700",
            paddingLeft: "24px",
            marginBottom: desktop ? 0 : 4,
            "&:focus": { ...focusStyleSecondary, backgroundColor: "#0064AF" },
          }}
        >
          <H2 sx={{ fontWeight: "normal", fontSize: "1rem", lineHeight: 1.1, color: "white", marginBottom: 0 }}>{t(`hakuohje-otsikko`)}</H2>
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
