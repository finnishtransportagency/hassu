import React, { ReactElement, useCallback, useState } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import Tabs, { TabProps } from "@components/layout/tabs/Tabs";
import HyvaksymispaatosTiedot from "@components/projekti/kansalaisnakyma/HyvaksymispaatosTiedot";
import TallentamattomiaMuutoksiaDialog from "@components/TallentamattomiaMuutoksiaDialog";
import useTranslation from "next-translate/useTranslation";
import { kuntametadata } from "../../../../common/kuntametadata";

export default function Hyvaksymispaatos(): ReactElement {
  const { lang } = useTranslation();
  const [currentTab, setCurrentTab] = useState<number | string>(0);
  const [open, setOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedValue, setSelectedValue] = useState<number | string>(0);

  const { data: projekti } = useProjektiJulkinen();
  const kuulutus = projekti?.hyvaksymisPaatosVaihe;
  const velho = kuulutus?.velho;
  const handleClickClose = () => {
    setOpen(false);
  };

  const handleClickOk = useCallback(() => {
    setIsDirty(false);
    setCurrentTab(selectedValue);
    setOpen(false);
  }, [selectedValue, setIsDirty]);

  const handleChange: TabProps["onChange"] = (_event, value) => {
    if (isDirty) {
      setOpen(true);
      setSelectedValue(value);
    } else {
      setOpen(false);
      setCurrentTab(value);
    }
  };
  if (!projekti || !kuulutus || !velho) {
    return <div />;
  }

  let sijainti = "";
  if (velho.maakunnat) {
    sijainti = sijainti + kuntametadata.namesForMaakuntaIds(velho.maakunnat, lang).join(", ") + "; ";
  }
  if (velho.kunnat) {
    sijainti = sijainti + kuntametadata.namesForKuntaIds(velho.kunnat, lang).join(", ");
  }

  return (
    <ProjektiJulkinenPageLayout selectedStep={4} title="">
      {projekti.jatkoPaatos1Vaihe && (
        <Tabs
          tabStyle="Underlined"
          value={currentTab}
          onChange={handleChange}
          tabs={[
            {
              label: "Hyväksymispäätös",
              content: <HyvaksymispaatosTiedot kuulutus={projekti.hyvaksymisPaatosVaihe} />,
              tabId: "hyvaksymispaatostiedot_tab",
            },
            {
              label: "Jatkopäätös",
              content: <HyvaksymispaatosTiedot kuulutus={projekti.jatkoPaatos1Vaihe} jatkopaatos={true} />,
              tabId: "aineisto_luku_tab",
            },
          ]}
        ></Tabs>
      )}
      {!projekti.jatkoPaatos1Vaihe && <HyvaksymispaatosTiedot kuulutus={projekti.hyvaksymisPaatosVaihe} />}
      <TallentamattomiaMuutoksiaDialog open={open} handleClickClose={handleClickClose} handleClickOk={handleClickOk} />
    </ProjektiJulkinenPageLayout>
  );
}
