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
}));

interface AccordionItem {
  title: string;
  content: ReactNode | string;
}

interface Props {
  items: AccordionItem[];
}

export default function CustomizedAccordions(props: Props) {
  const { items } = props;
  const [expanded, setExpanded] = useState<number | false>(false);

  const handleChange = (panel: number) => (_: React.SyntheticEvent, newExpanded: boolean) => {
    setExpanded(newExpanded ? panel : false);
  };

  return (
    <div>
      {items.map((item, id) => (
        <Accordion expanded={expanded === id} onChange={handleChange(id)}>
          <AccordionSummary>{item.title}</AccordionSummary>
          <AccordionDetails>{item.content}</AccordionDetails>
        </Accordion>
      ))}
    </div>
  );
}
