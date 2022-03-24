import React, { ReactNode } from "react";
import TabsUnstyled from "@mui/base/TabsUnstyled";
import TabsListUnstyled from "@mui/base/TabsListUnstyled";
import TabPanelUnstyled from "@mui/base/TabPanelUnstyled";
import TabUnstyled from "@mui/base/TabUnstyled";
import { styled, experimental_sx as sx } from "@mui/material";
import isPropValid from "@emotion/is-prop-valid";

interface Tabs {
  label: string;
  content: string | ReactNode;
  value?: string | number;
}

interface Props {
  tabs: Tabs[];
  onChange?: ((event: React.SyntheticEvent<Element, Event>, value: string | number) => void) | undefined;
  value?: string | number | false;
  defaultValue?: string | number | false;
}

export default function TabbedContent(props: Props) {
  return (
    <TabsUnstyled onChange={props.onChange} value={props.value} defaultValue={props.defaultValue}>
      <TabsList>
        {props.tabs.map((tab, index) => (
          <Tab key={index} value={tab.value || index}>
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

const TabPanel = styled(TabPanelUnstyled, { shouldForwardProp: isPropValid })(
  sx({
    marginTop: 7,
  })
);

const TabsList = styled(TabsListUnstyled, { shouldForwardProp: isPropValid })(
  sx({
    boxShadow: "0px -2px 0px 0px #E6E6E6 inset",
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
    borderColor: "transparent",
    "&.TabUnstyled-root.Mui-selected": {
      borderColor: "#E6E6E6",
      borderBottomColor: "#FFFFFF",
    },
  })
);
