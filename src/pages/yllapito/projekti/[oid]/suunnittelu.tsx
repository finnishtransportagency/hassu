import React, { ReactElement, useCallback, useMemo, useState } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section";
import Tabs, { HassuTabProps } from "@components/layout/tabs/Tabs";
import SuunnitteluvaiheenPerustiedot from "@components/projekti/suunnitteluvaihe/SuunnitteluvaiheenPerustiedot";
import SuunnitteluvaiheenVuorovaikuttaminen from "@components/projekti/suunnitteluvaihe/SuunnitteluvaiheenVuorovaikuttaminen";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import TallentamattomiaMuutoksiaDialog from "@components/TallentamattomiaMuutoksiaDialog";
import SuunnitteluvaiheenPerustiedotLukutila from "@components/projekti/lukutila/SuunnitteluvaiheenPerustiedotLukutila";
import VuorovaikuttaminenLukutila from "@components/projekti/lukutila/VuorovaikuttaminenLukutila";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { SuunnitteluVaiheTila } from "../../../../../common/graphql/apiModel";

export default function SuunnitteluWrapper() {
  const { data: projekti } = useProjekti();

  if (!projekti) {
    return <></>;
  }

  return <Suunnittelu projekti={projekti} />;
}

function Suunnittelu({ projekti }: { projekti: ProjektiLisatiedolla }): ReactElement {
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

  const handleChange = useCallback(
    (_event: React.SyntheticEvent<Element, Event>, value: string | number) => {
      if (isDirty) {
        setOpen(true);
        setSelectedValue(value);
      } else {
        setOpen(false);
        setCurrentTab(value);
      }
    },
    [isDirty]
  );

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

  const migroitu = projekti?.suunnitteluVaihe?.tila == SuunnitteluVaiheTila.MIGROITU;

  return (
    <ProjektiPageLayout title="Suunnittelu">
      {!migroitu && (
        <>
          <Section noDivider>
            <Tabs tabStyle="Underlined" value={currentTab} onChange={handleChange} tabs={vuorovaikutusTabs} />
          </Section>
          <TallentamattomiaMuutoksiaDialog open={open} handleClickClose={handleClickClose} handleClickOk={handleClickOk} />
        </>
      )}
      {migroitu && (
        <Section noDivider>
          <>
            <p>Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.</p>
          </>
        </Section>
      )}
    </ProjektiPageLayout>
  );
}
