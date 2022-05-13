import React, { ReactElement, useState, useMemo } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { useRouter } from "next/router";
import useProjekti from "src/hooks/useProjekti";
import { PageProps } from "@pages/_app";
import Section from "@components/layout/Section";
import Tabs from "@components/layout/tabs/Tabs";
import SuunnitteluvaiheenPerustiedot from "@components/projekti/suunnitteluvaihe/SuunnitteluvaiheenPerustiedot";
import HassuDialog from "@components/HassuDialog";
import HassuStack from "@components/layout/HassuStack";
import Button from "@components/button/Button";
import SuunnitteluvaiheenVuorovaikuttaminen from "@components/projekti/suunnitteluvaihe/SuunnitteluvaiheenVuorovaikuttaminen";
import { DialogActions, DialogContent } from "@mui/material";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";

export default function Suunnittelu({ setRouteLabels }: PageProps): ReactElement {
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti, mutate: reloadProjekti } = useProjekti(oid);
  const [isChildDirty, setIsChildDirty] = useState(false);
  const [currentTab, setCurrentTab] = useState(1);
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(1);

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
    let tabs = [];
    tabs.push({
      label: "Suunnitteluvaiheen perustiedot",
      content: (
        <SuunnitteluvaiheenPerustiedot
          projekti={projekti}
          reloadProjekti={reloadProjekti}
          isDirtyHandler={setIsChildDirty}
        />
      ),
      value: 1,
    });

    if (!projekti) {
      return tabs;
    }

    if (!projekti.suunnitteluVaihe?.vuorovaikutukset || projekti.suunnitteluVaihe.vuorovaikutukset.length < 1) {
      tabs.push({
        label: "1. Vuorovaikuttaminen",
        content: (
          <SuunnitteluvaiheenVuorovaikuttaminen
            projekti={projekti}
            reloadProjekti={reloadProjekti}
            isDirtyHandler={setIsChildDirty}
            vuorovaikutusnro={1}
          />
        ),
        value: 2,
      });
    } else {
      projekti.suunnitteluVaihe.vuorovaikutukset.forEach((vuorovaikutus, index) => {
        let tab = {
          label: `${vuorovaikutus.vuorovaikutusNumero}. Vuorovaikuttaminen`,
          content: (
            <SuunnitteluvaiheenVuorovaikuttaminen
              projekti={projekti}
              reloadProjekti={reloadProjekti}
              isDirtyHandler={setIsChildDirty}
              vuorovaikutusnro={vuorovaikutus.vuorovaikutusNumero}
            />
          ),
          value: index + 2,
        };

        tabs.push(tab);
      });
    }
    return tabs;
  }, [projekti, reloadProjekti]);

  return (
    <ProjektiPageLayout title="Suunnittelu">
      <Section noDivider>
        <Tabs
          tabStyle={"Underlined"}
          defaultValue={1}
          value={currentTab}
          onChange={handleChange}
          tabs={vuorovaikutusTabs}
        />
      </Section>
      <div>
        <HassuDialog title="Tallentamattomia muutoksia" open={open} onClose={handleClickClose}>
          <DialogContent>
            <HassuStack>
              <p>
                Olet tehnyt sivulle muutoksia, joita ei ole tallennettu. Tehdyt muutokset menetetään, jos poistut
                sivulta. Haluatko poistua tallentamatta?{" "}
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
      </div>
    </ProjektiPageLayout>
  );
}
