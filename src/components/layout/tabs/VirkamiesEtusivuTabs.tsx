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
  paddingLeft: 30,
  paddingRight: 30,
  color: "#0063af",
  ":hover": {
    backgroundColor: "#F8F8F8",
  },
  "@media (max-width: 900px)": {
    marginRight: 30,
    padding: 0,
  },
});

const HassuTabs = styled(Tabs)({});

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
