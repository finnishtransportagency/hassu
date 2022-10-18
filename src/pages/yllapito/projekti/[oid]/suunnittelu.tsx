import React, { ReactElement, useState, useMemo, useCallback } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { PageProps } from "@pages/_app";
import Section from "@components/layout/Section";
import Tabs, { HassuTabProps } from "@components/layout/tabs/Tabs";
import SuunnitteluvaiheenPerustiedot from "@components/projekti/suunnitteluvaihe/SuunnitteluvaiheenPerustiedot";
import SuunnitteluvaiheenVuorovaikuttaminen from "@components/projekti/suunnitteluvaihe/SuunnitteluvaiheenVuorovaikuttaminen";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
import { useProjekti } from "src/hooks/useProjekti";
import TallentamattomiaMuutoksiaDialog from "@components/TallentamattomiaMuutoksiaDialog";
import SuunnitteluvaiheenPerustiedotLukutila from "@components/projekti/lukutila/SuunnitteluvaiheenPerustiedotLukutila";
import VuorovaikuttaminenLukutila from "@components/projekti/lukutila/VuorovaikuttaminenLukutila";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";

export default function Suunnittelu({ setRouteLabels }: PageProps): ReactElement {
  useProjektiBreadcrumbs(setRouteLabels);
  const { data: projekti } = useProjekti();
  const [currentTab, setCurrentTab] = useState<number | string>(0);
  const [open, setOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedValue, setSelectedValue] = useState<number | string>(0);

  const handleClickClose = () => {
    setOpen(false);
  };

  const handleClickOk = useCallback(() => {
    setIsDirty(false);
    setCurrentTab(selectedValue);
    setOpen(false);
  }, [selectedValue, setIsDirty]);

  const handleChange = (_event: React.SyntheticEvent<Element, Event>, value: string | number) => {
    if (isDirty) {
      setOpen(true);
      setSelectedValue(value);
    } else {
      setOpen(false);
      setCurrentTab(value);
    }
  };

  const vuorovaikutusTabs = useMemo(() => {
    const tabs: HassuTabProps[] = [
      {
        label: "Suunnitteluvaiheen perustiedot",
        tabId: "perustiedot_tab",
        content: projektiOnEpaaktiivinen(projekti) ? (
          <SuunnitteluvaiheenPerustiedotLukutila />
        ) : (
          <SuunnitteluvaiheenPerustiedot isDirtyHandler={setIsDirty} />
        ),
      },
    ];
    if (!projekti) {
      return tabs;
    }

    if (projektiOnEpaaktiivinen(projekti)) {
      projekti?.suunnitteluVaihe?.vuorovaikutukset?.forEach((vuorovaikutus) => {
        tabs.push({
          label: "1. Vuorovaikuttaminen",
          tabId: "1_vuorovaikuttaminen_tab",
          disabled: false,
          content: <VuorovaikuttaminenLukutila vuorovaikutusnro={vuorovaikutus.vuorovaikutusNumero} />,
        });
      });
    } else if (!projekti.suunnitteluVaihe?.vuorovaikutukset?.length) {
      tabs.push({
        label: "1. Vuorovaikuttaminen",
        tabId: "1_vuorovaikuttaminen_tab",
        disabled: !projekti.suunnitteluVaihe,
        content: <SuunnitteluvaiheenVuorovaikuttaminen isDirtyHandler={setIsDirty} vuorovaikutusnro={1} />,
      });
    } else {
      projekti?.suunnitteluVaihe?.vuorovaikutukset?.forEach((vuorovaikutus) => {
        const tab = {
          label: `${vuorovaikutus.vuorovaikutusNumero}. Vuorovaikuttaminen`,
          tabId: `${vuorovaikutus.vuorovaikutusNumero}_vuorovaikuttaminen_tab`,
          disabled: !projekti.suunnitteluVaihe,
          content: (
            <SuunnitteluvaiheenVuorovaikuttaminen vuorovaikutusnro={vuorovaikutus.vuorovaikutusNumero} isDirtyHandler={setIsDirty} />
          ),
        };
        tabs.push(tab);
      });
    }
    return tabs;
  }, [projekti]);

  return (
    <ProjektiPageLayout title="Suunnittelu">
      <Section noDivider>
        <Tabs tabStyle={"Underlined"} value={currentTab} onChange={handleChange} tabs={vuorovaikutusTabs} />
      </Section>
      <TallentamattomiaMuutoksiaDialog open={open} handleClickClose={handleClickClose} handleClickOk={handleClickOk} />
    </ProjektiPageLayout>
  );
}
