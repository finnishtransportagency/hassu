import { ComponentProps, Dispatch, Key, ReactNode, useState } from "react";
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
    expandIcon={<FontAwesomeIcon icon="angle-right" className="text-primary-dark" size="lg" style={{ margin: "auto", height: "100%" }} />}
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

export interface AccordionItem {
  title: string | JSX.Element;
  content: ReactNode | string;
  id?: Key;
}

type Props = {
  items: AccordionItem[];
  singular?: boolean;
  expandedState?: [Key[], Dispatch<Key[]>];
} & ComponentProps<"div">;

export default function CustomizedAccordions(props: Props) {
  const { items, singular, ...rest } = props;
  const uncontrolledExpanded = useState<Key[]>([]);

  const [expanded, setExpanded] = props.expandedState ?? uncontrolledExpanded;

  const handleChange = (panel: Key) => (_: React.SyntheticEvent, newExpanded: boolean) => {
    if (singular) {
      setExpanded(newExpanded ? [panel] : []);
    } else {
      setExpanded(newExpanded ? [...expanded, panel] : (expanded as number[] | []).filter((panelId) => panelId !== panel));
    }
  };

  return (
    <div {...rest}>
      {items.map((item, index) => {
        const key = item.id ?? index;
        return (
          <Accordion
            key={key}
            id={typeof item.id === "string" ? item.id : undefined}
            expanded={expanded.includes(key)}
            onChange={handleChange(key)}
          >
            <AccordionSummary>
              {typeof item.title === "string" ? <span className="vayla-smallest-title">{item.title}</span> : item.title}
            </AccordionSummary>
            <AccordionDetails>{item.content}</AccordionDetails>
          </Accordion>
        );
      })}
    </div>
  );
}
