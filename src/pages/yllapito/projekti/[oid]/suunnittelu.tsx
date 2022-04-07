import React, { ReactElement, useEffect, useState } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { useRouter } from "next/router";
import useProjekti from "src/hooks/useProjekti";
import { PageProps } from "@pages/_app";
import Section from "@components/layout/Section";
import Tabs from "@components/layout/tabs/Tabs";
import SuunnitteluvaiheenPerustiedot from "@components/projekti/suunnitteluvaihe/SuunniteluvaiheenPerustiedot";
import HassuDialog from "@components/HassuDialog";
import SectionContent from "@components/layout/SectionContent";
import WindowCloseButton from "@components/button/WindowCloseButton";
import HassuStack from "@components/layout/HassuStack";
import Button from "@components/button/Button";

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

  useEffect(() => {
    if (router.isReady) {
      let routeLabel = "";
      if (projekti?.velho?.nimi) {
        routeLabel = projekti.velho?.nimi;
      } else if (typeof oid === "string") {
        routeLabel = oid;
      }
      if (routeLabel) {
        setRouteLabels({ "/yllapito/projekti/[oid]": { label: routeLabel } });
      }
    }
  }, [router.isReady, oid, projekti, setRouteLabels]);

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

  return (
    <ProjektiPageLayout title="Suunnittelu">
      <Section noDivider>
        <Tabs
          defaultValue={1}
          value={currentTab}
          onChange={(event, value) => {
            handleChange(event, value);
          }}
          tabs={[
            {
              label: "Suunnitteluvaiheen perustiedot",
              content: (
                <SuunnitteluvaiheenPerustiedot
                  projekti={projekti}
                  reloadProjekti={reloadProjekti}
                  isDirtyHandler={(isDirty: boolean) => {
                    setIsChildDirty(isDirty);
                  }}
                />
              ),
              value: 1,
            },
            { label: "1. Vuorovaikuttaminen", content: <SuunniteluvaiheenVuorovaikutus />, value: 2 },
          ]}
        />
      </Section>
      <div>
        <HassuDialog open={open} onClose={handleClickClose}>
          <Section noDivider smallGaps>
            <SectionContent>
              <div className="vayla-dialog-title flex">
                <div className="flex-grow">Varmistus</div>
                <div className="justify-end">
                  <WindowCloseButton
                    onClick={() => {
                      handleClickClose();
                    }}
                  ></WindowCloseButton>
                </div>
              </div>
            </SectionContent>
            <SectionContent>
              <div className="vayla-dialog-content">
                <form>
                  <HassuStack>
                    <p>Sivulla on tallentamattomia tietoja. Haluatko siirtyä pois sivulta ja hylätä muutokset?</p>
                  </HassuStack>
                  <HassuStack
                    direction={["column", "column", "row"]}
                    justifyContent={[undefined, undefined, "flex-end"]}
                    paddingTop={"1rem"}
                  >
                    <Button
                      primary
                      onClick={(e) => {
                        handleClickOk();
                        e.preventDefault();
                      }}
                    >
                      Hylkää muutokset ja siirry
                    </Button>
                    <Button
                      onClick={(e) => {
                        handleClickClose();
                        e.preventDefault();
                      }}
                    >
                      Peruuta
                    </Button>
                  </HassuStack>
                </form>
              </div>
            </SectionContent>
          </Section>
        </HassuDialog>
      </div>
    </ProjektiPageLayout>
  );
}

const SuunniteluvaiheenVuorovaikutus = () => {
  return <>Vuorovaikutustiedot tähän</>;
};
