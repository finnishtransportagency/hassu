import React, { ReactElement, useState, useMemo } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { PageProps } from "@pages/_app";
import Section from "@components/layout/Section";
import Tabs, { HassuTabProps } from "@components/layout/tabs/Tabs";
import SuunnitteluvaiheenPerustiedot from "@components/projekti/suunnitteluvaihe/SuunnitteluvaiheenPerustiedot";
import HassuDialog from "@components/HassuDialog";
import HassuStack from "@components/layout/HassuStack";
import Button from "@components/button/Button";
import SuunnitteluvaiheenVuorovaikuttaminen from "@components/projekti/suunnitteluvaihe/SuunnitteluvaiheenVuorovaikuttaminen";
import { DialogActions, DialogContent } from "@mui/material";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
import { useProjektiRoute } from "src/hooks/useProjektiRoute";

export default function Suunnittelu({ setRouteLabels }: PageProps): ReactElement {
  const { data: projekti } = useProjektiRoute();
  const [isChildDirty, setIsChildDirty] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(0);

  const handleClickClose = () => {
    setOpen(false);
  };

  const handleClickOk = () => {
    setIsChildDirty(false);
    setCurrentTab(selectedValue);
    setOpen(false);
  };

  useProjektiBreadcrumbs(setRouteLabels);

  const handleChange = (event: React.SyntheticEvent<Element, Event>, value: string | number) => {
    if (isChildDirty) {
      setOpen(true);
      setSelectedValue(value as number);
      event.preventDefault();
    } else {
      setOpen(false);
      setCurrentTab(value as number);
    }
  };

  const vuorovaikutusTabs = useMemo(() => {
    const tabs: HassuTabProps[] = [
      {
        label: "Suunnitteluvaiheen perustiedot",
        tabId: "perustiedot_tab",
        content: <SuunnitteluvaiheenPerustiedot isDirtyHandler={setIsChildDirty} />,
      },
    ];
    if (!projekti) {
      return tabs;
    }

    if (!projekti.suunnitteluVaihe?.vuorovaikutukset?.length) {
      tabs.push({
        label: "1. Vuorovaikuttaminen",
        tabId: "1_vuorovaikuttaminen_tab",
        disabled: !projekti.suunnitteluVaihe,
        content: <SuunnitteluvaiheenVuorovaikuttaminen isDirtyHandler={setIsChildDirty} vuorovaikutusnro={1} />,
      });
    } else {
      projekti?.suunnitteluVaihe?.vuorovaikutukset?.forEach((vuorovaikutus) => {
        const tab = {
          label: `${vuorovaikutus.vuorovaikutusNumero}. Vuorovaikuttaminen`,
          tabId: `${vuorovaikutus.vuorovaikutusNumero}_vuorovaikuttaminen_tab`,
          disabled: !projekti.suunnitteluVaihe,
          content: (
            <SuunnitteluvaiheenVuorovaikuttaminen
              isDirtyHandler={setIsChildDirty}
              vuorovaikutusnro={vuorovaikutus.vuorovaikutusNumero}
            />
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
      <HassuDialog title="Tallentamattomia muutoksia" open={open} onClose={handleClickClose}>
        <DialogContent>
          <HassuStack>
            <p>
              Olet tehnyt sivulle muutoksia, joita ei ole tallennettu. Tehdyt muutokset menetetään, jos poistut sivulta.
              Haluatko poistua tallentamatta?
            </p>
          </HassuStack>
        </DialogContent>
        <DialogActions>
          <Button primary onClick={handleClickOk}>
            Hylkää muutokset ja siirry
          </Button>
          <Button onClick={handleClickClose}>Peruuta</Button>
        </DialogActions>
      </HassuDialog>
    </ProjektiPageLayout>
  );
}
