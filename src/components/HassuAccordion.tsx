import { ReactNode, useState } from "react";
import { styled } from "@mui/material/styles";
import MuiAccordion, { AccordionProps } from "@mui/material/Accordion";
import MuiAccordionSummary, { AccordionSummaryProps } from "@mui/material/AccordionSummary";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Accordion = styled((props: AccordionProps) => <MuiAccordion disableGutters elevation={0} square {...props} />)({
  "&:not(:last-child)": {
    borderBottom: 0,
  },
  "&:before": {
    display: "none",
  },
});

const AccordionSummary = styled((props: AccordionSummaryProps) => (
  <MuiAccordionSummary
    expandIcon={
      <FontAwesomeIcon
        icon="angle-right"
        className="text-primary-dark"
        size="lg"
        style={{ margin: "auto", height: "100%" }}
      />
    }
    {...props}
  />
))(({ theme }) => ({
  flexDirection: "row-reverse",
  "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
    transform: "rotate(90deg)",
  },
  "& .MuiAccordionSummary-expandIconWrapper": {
    width: "24px",
    height: "24px",
  },
  padding: 0,
  "& .MuiAccordionSummary-content": {
    marginLeft: theme.spacing(3),
  },
}));

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(3),
  paddingLeft: theme.spacing(9),
  paddingRight: 0,
}));

interface AccordionItem {
  title: string;
  content: ReactNode | string;
}

interface Props {
  items: AccordionItem[];
  singular?: boolean;
}

export default function CustomizedAccordions(props: Props) {
  const { items, singular } = props;
  const [expanded, setExpanded] = useState<number[]>([]);

  const handleChange = (panel: number) => (_: React.SyntheticEvent, newExpanded: boolean) => {
    if (singular) {
      setExpanded(newExpanded ? [panel] : []);
    } else {
      setExpanded(
        newExpanded ? [...expanded, panel] : (expanded as number[] | []).filter((panelId) => panelId !== panel)
      );
    }
  };

  return (
    <div>
      {items.map((item, index) => (
        <Accordion key={index} expanded={expanded.includes(index)} onChange={handleChange(index)}>
          <AccordionSummary>
            <span className="vayla-smallest-title">{item.title}</span>
          </AccordionSummary>
          <AccordionDetails>{item.content}</AccordionDetails>
        </Accordion>
      ))}
    </div>
  );
}
