import React, { ReactNode } from "react";
import TabsUnstyled from "@mui/base/TabsUnstyled";
import TabsListUnstyled from "@mui/base/TabsListUnstyled";
import TabPanelUnstyled from "@mui/base/TabPanelUnstyled";
import TabUnstyled from "@mui/base/TabUnstyled";
import { styled, experimental_sx as sx } from "@mui/material";
import isPropValid from "@emotion/is-prop-valid";

const TabStyle = {
  Underlined: {
    borderWidth: "4px",
    "&.TabUnstyled-root.Mui-selected": {
      borderColor: "#FFFFFF",
      borderBottomColor: "#0064AF",
      color: "#0064AF",
    },
    "&:disabled": {
      cursor: "default",
      color: "#999999",
    },
  },
} as const;

export type TabStyle = keyof typeof TabStyle;

export interface HassuTabProps {
  label: string;
  tabId?: string;
  content?: string | ReactNode;
  value?: string | number;
  disabled?: boolean;
}

interface Props {
  tabs: HassuTabProps[];
  onChange?: ((event: React.SyntheticEvent<Element, Event>, value: string | number) => void) | undefined;
  value?: string | number | false;
  defaultValue?: string | number | false;
  tabStyle?: TabStyle;
}

export default function TabbedContent(props: Props) {
  return (
    <TabsUnstyled onChange={props.onChange} value={props.value} defaultValue={props.defaultValue}>
      <TabsList>
        {props.tabs.map((tab, index) => (
          <Tab
            key={index}
            id={tab.tabId}
            disabled={tab.disabled}
            value={tab.value || index}
            sx={props.tabStyle ? TabStyle[props.tabStyle] : undefined}
          >
            {tab.label}
          </Tab>
        ))}
      </TabsList>
      {props.tabs.map((tab, index) => (
        <TabPanel key={index} value={tab.value || index}>
          {tab.content}
        </TabPanel>
      ))}
    </TabsUnstyled>
  );
}

const TabPanel = styled(TabPanelUnstyled, { shouldForwardProp: isPropValid })(sx({}));

const TabsList = styled(TabsListUnstyled, { shouldForwardProp: isPropValid })(
  sx({
    borderBottom: "2px solid #E6E6E6",
    marginBottom: 7,
  })
);

const Tab = styled(TabUnstyled, { shouldForwardProp: isPropValid })(
  sx({
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 4.5,
    paddingBottom: 4.5,
    borderTopLeftRadius: "0.375rem",
    borderTopRightRadius: "0.375rem",
    borderWidth: "2px",
    borderStyle: "solid",
    marginBottom: "-2px",
    borderColor: "transparent",
    "&.TabUnstyled-root.Mui-selected": {
      borderColor: "#E6E6E6",
      borderBottomColor: "#FFFFFF",
    },
    "&:disabled": {
      cursor: "default",
      color: "#999999",
    },
  })
);
