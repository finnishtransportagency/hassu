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
    expandIcon={<FontAwesomeIcon icon="angle-right" className="text-primary-dark m-auto h-full" size="lg" />}
    {...props}
  />
))(({ theme }) => ({
  flexDirection: "row-reverse",
  alignItems: "start",
  "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
    transform: "rotate(90deg)",
  },
  "& .MuiAccordionSummary-expandIconWrapper": {
    minWidth: "24px",
    minHeight: "24px",
    marginTop: "12px",
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
  tooltip?: JSX.Element;
}

type Props = {
  items: AccordionItem[];
  singular?: boolean;
  expandedstate?: [Key[], Dispatch<Key[]>];
} & ComponentProps<"div">;

export default function CustomizedAccordions(props: Props) {
  const { items, singular, ...rest } = props;
  const uncontrolledExpanded = useState<Key[]>([]);

  const [expanded, setExpanded] = props.expandedstate ?? uncontrolledExpanded;

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
            <AccordionSummary sx={{pointerEvents: "auto"}}>
              {typeof item.title === "string" ? <h5 className="vayla-smallest-title mb-0">{item.title}</h5> : item.title}
            </AccordionSummary>
            <AccordionDetails>{item.content}</AccordionDetails>
          </Accordion>
        );
      })}
    </div>
  );
}
