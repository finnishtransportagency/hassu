import React, { ReactElement } from "react";
import { styled } from "@mui/material/styles";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel, { stepLabelClasses } from "@mui/material/StepLabel";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import StepConnector, { stepConnectorClasses } from "@mui/material/StepConnector";
import { StepIconProps } from "@mui/material/StepIcon";
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
interface Props {
  oid: string;
  activeStep: number;
  selectedStep: number;
  vertical?: true;
}
export default function ProjektiJulkinenStepper({ oid, activeStep, selectedStep, vertical }: Props): ReactElement {

  const HassuLabel = styled(StepLabel)(() => ({
    [`&.${stepLabelClasses.vertical}`]: {
      paddingTop: 0,
      paddingBottom: 0,
    },
  }));

  const HassuConnector = styled(StepConnector)(() => ({
    [`&.${stepConnectorClasses.root}`]: {
      left: "calc(-50%)",
      right: "calc(50%)",
    },
    [`&.${stepConnectorClasses.active}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        backgroundImage: "linear-gradient( 117deg, #009AE1, #009AE1)",
      },
    },
    [`&.${stepConnectorClasses.completed}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        backgroundImage: "linear-gradient(117deg, #009AE1, #009AE1)",
      },
    },
    [`& .${stepConnectorClasses.line}`]: {
      height: 10,
      border: 0,
      backgroundColor: "#D8D8D8",
      borderRadius: 1,
    },
    [`& .${stepConnectorClasses.lineVertical}`]: {
      width: 10,
      border: 0,
      backgroundColor: "#D8D8D8",
      borderRadius: 1,
    },
  }));

  const HassuStepIconRoot = styled("div")<{
    ownerState: { completed?: boolean; active?: boolean };
  }>(({ ownerState }) => ({
    backgroundColor: "#D8D8D8",
    zIndex: 1,
    color: "#fff",
    width: 30,
    height: 30,
    display: "flex",
    borderRadius: "50%",
    justifyContent: "center",
    alignItems: "center",
    ...(ownerState.active && {
      backgroundImage: "linear-gradient(117deg, #0064AF, #0064AF)",
      boxShadow: "0 0 0 10px #009AE1",
    }),
    ...(ownerState.completed && {
      backgroundImage: "linear-gradient(117deg, #009AE1, #009AE1)",
    }),
  }));

  function HassuStepIcon(props: StepIconProps) {
    const { active, completed, className } = props;

    return <HassuStepIconRoot ownerState={{ completed, active }} className={className}></HassuStepIconRoot>;
  }

  const steps = [
    `${vertical ? "1." : ""} Suunnittelun käynnistäminen`,
    `${vertical ? "2." : ""} Suunnittelussa`,
    `${vertical ? "3." : ""} Suunnitteluaineisto nähtävillä`,
    `${vertical ? "4." : ""} Hyväksynnässä`,
    `${vertical ? "5." : ""} Päätös`,
    `${vertical ? "6." : ""} Lainvoimaisuus`,
  ];

  return (
    <>
      {!vertical && (
        <div>
          <Stepper alternativeLabel activeStep={activeStep} connector={<HassuConnector />}>
            {steps.map((label, index) => (
              <Step key={label}>
                <HassuLabel
                  componentsProps={{ label: { style: { fontWeight: selectedStep === index ? 700 : 400 } } }}
                  StepIconComponent={HassuStepIcon}
                  StepIconProps={{}}
                >
                  {label}
                </HassuLabel>
              </Step>
            ))}
          </Stepper>
        </div>
      )}
      {vertical && (
        <div>
          <Accordion sx={{ border: "grey 1px solid" }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header">
              <Typography>Navigoi vaiheita</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ padding: "1rem", borderTop: "1px grey solid" }}>
              <Stepper activeStep={activeStep} orientation="vertical" connector={<HassuConnector />}>
                {steps.map((label, index) => (
                  <Step key={label}>
                    <HassuLabel
                      componentsProps={{ label: { style: { fontWeight: selectedStep === index ? 700 : 400 } } }}
                      StepIconComponent={HassuStepIconRoot}
                      error={true}
                    >
                      {label}
                    </HassuLabel>
                  </Step>
                ))}
              </Stepper>
            </AccordionDetails>
          </Accordion>
        </div>
      )}
    </>
  );
}
