import { Tab, Tabs } from "@mui/material";
import { styled } from "@mui/system";

type VirkamiesEtusivuTabsProps = {
  value: string | undefined;
  onChange: (_: any, value: any) => void;
  tabItems: {
    label: string;
    value: string;
  }[];
};

const HassuTab = styled(Tab)({
  paddingLeft: 0,
  paddingRight: 0,
  marginLeft: 60,
  marginRight: 60,
  color: "#0063af",
});

const HassuTabs = styled(Tabs)({
  // boxSizing: "border-box",
});

const VirkamiesEtusivuTabs = ({ value, onChange, tabItems }: VirkamiesEtusivuTabsProps) => {
  return (
    <HassuTabs
      value={value}
      variant="scrollable"
      allowScrollButtonsMobile
      onChange={onChange}
      TabIndicatorProps={{
        sx: {
          background: "#0063af",
        },
      }}
    >
      {tabItems.map((tab) => {
        return <HassuTab key={tab.label} label={tab.label} value={tab.value} />;
      })}
    </HassuTabs>
  );
};

export default VirkamiesEtusivuTabs;
