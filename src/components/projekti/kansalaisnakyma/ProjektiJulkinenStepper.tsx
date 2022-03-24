import React, { ReactElement } from "react";
import { styled } from "@mui/material/styles";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import ArchitectureIcon from "@mui/icons-material/Architecture";
import VideoLabelIcon from "@mui/icons-material/VideoLabel";
import Gavel from "@mui/icons-material/Gavel";
import AccountBalance from "@mui/icons-material/AccountBalance";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import StartIcon from "@mui/icons-material/Start";
import StepConnector, { stepConnectorClasses } from "@mui/material/StepConnector";
import { StepIconProps } from "@mui/material/StepIcon";

export default function ProjektiJulkinenStepper(): ReactElement {
  const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
    [`&.${stepConnectorClasses.alternativeLabel}`]: {
      top: 22,
    },
    [`&.${stepConnectorClasses.active}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        // backgroundImage: "linear-gradient( 95deg,rgb(242,113,33) 0%,rgb(233,64,87) 50%,rgb(138,35,135) 100%)",
        backgroundImage: "linear-gradient( 90deg, #009AE0 0%, rgb(0,100,175) 100%)",
      },
    },
    [`&.${stepConnectorClasses.completed}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        // backgroundImage: "linear-gradient( 95deg,rgb(242,113,33) 0%,rgb(233,64,87) 50%,rgb(138,35,135) 100%)",
        // backgroundImage: "linear-gradient( 90deg, rgb(0,100,175) 0%, rgb(73,194,241) 100%)",
        backgroundImage: "linear-gradient(117deg, #009AE0, #009AE0)",
      },
    },
    [`& .${stepConnectorClasses.line}`]: {
      height: 5,
      border: 0,
      backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey[800] : "#eaeaf0",
      borderRadius: 1,
    },
  }));

  const ColorlibStepIconRoot = styled("div")<{
    ownerState: { completed?: boolean; active?: boolean };
  }>(({ theme, ownerState }) => ({
    backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey[700] : "#ccc",
    zIndex: 1,
    color: "#fff",
    width: 50,
    height: 50,
    display: "flex",
    borderRadius: "50%",
    justifyContent: "center",
    alignItems: "center",
    ...(ownerState.active && {
      //   backgroundImage: "linear-gradient( 136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)",
    //   backgroundImage: "linear-gradient( 90deg, rgb(0,100,175) 0%, rgb(73,194,241) 100%)",
    backgroundImage: "linear-gradient(117deg, #0064AF, #0064AF)",
      boxShadow: "0 4px 10px 0 rgba(0,0,0,.25)",
    }),
    ...(ownerState.completed && {
      //   backgroundImage: "linear-gradient( 136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)",
    //   backgroundImage: "linear-gradient( 90deg, rgb(0,100,175) 0%, rgb(73,194,241) 100%)",
    backgroundImage: "linear-gradient(117deg, #009AE0, #009AE0)",
    }),
  }));

  function ColorlibStepIcon(props: StepIconProps) {
    const { active, completed, className } = props;

    const icons: { [index: string]: React.ReactElement } = {
      1: <StartIcon />,
      2: <ArchitectureIcon />,
      3: <VideoLabelIcon />,
      4: <HourglassEmptyIcon />,
      5: <AccountBalance />,
      6: <Gavel />,
    };

    return (
      <ColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
        {icons[String(props.icon)]}
      </ColorlibStepIconRoot>
    );
  }

  const steps = [
    "Suunnittelun käynnistäminen",
    "Suunnittelussa",
    "Suunnitteluaineisto nähtävillä",
    "Hyväksynnässä",
    "Päätös",
    "Lainvoimaisuus",
  ];

  return (
    <>
      <div>
        {/* <img src="/etenemispalkki.png" alt="etenemispalkki" /> */}
        <Stepper alternativeLabel activeStep={2} connector={<ColorlibConnector />}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel StepIconComponent={ColorlibStepIcon}>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </div>
    </>
  );
}
