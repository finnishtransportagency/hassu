import React, { ReactElement, useState, useMemo } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { useRouter } from "next/router";
import useProjekti from "src/hooks/useProjekti";
import { PageProps } from "@pages/_app";
import Section from "@components/layout/Section";
import Tabs, { HassuTabProps } from "@components/layout/tabs/Tabs";
import SuunnitteluvaiheenPerustiedot from "@components/projekti/suunnitteluvaihe/SuunnitteluvaiheenPerustiedot";
import HassuDialog from "@components/HassuDialog";
import HassuStack from "@components/layout/HassuStack";
import Button from "@components/button/Button";
import { setupLambdaMonitoring } from "backend/src/aws/monitoring";
import SuunnitteluvaiheenVuorovaikuttaminen from "@components/projekti/suunnitteluvaihe/SuunnitteluvaiheenVuorovaikuttaminen";
import { DialogActions, DialogContent } from "@mui/material";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
import { ViranomaisVastaanottajaInput } from "@services/api";
import { GetServerSideProps } from "next";
import { GetParameterResult } from "aws-sdk/clients/ssm";
import log from "loglevel";

export default function Suunnittelu({ setRouteLabels, kirjaamoOsoitteet }: PageProps & ServerSideProps): ReactElement {
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti, mutate: reloadProjekti } = useProjekti(oid);
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
        content: (
          <SuunnitteluvaiheenPerustiedot
            projekti={projekti}
            reloadProjekti={reloadProjekti}
            isDirtyHandler={setIsChildDirty}
          />
        ),
      },
    ];
    if (!projekti) {
      return tabs;
    }

    if (!projekti.suunnitteluVaihe?.vuorovaikutukset?.length) {
      tabs.push({
        label: "1. Vuorovaikuttaminen",
        disabled: !projekti.suunnitteluVaihe,
        content: (
          <SuunnitteluvaiheenVuorovaikuttaminen
            projekti={projekti}
            reloadProjekti={reloadProjekti}
            isDirtyHandler={setIsChildDirty}
            vuorovaikutusnro={1}
            kirjaamoOsoitteet={kirjaamoOsoitteet || null}
          />
        ),
      });
    } else {
      projekti?.suunnitteluVaihe?.vuorovaikutukset?.forEach((vuorovaikutus) => {
        const tab = {
          label: `${vuorovaikutus.vuorovaikutusNumero}. Vuorovaikuttaminen`,
          disabled: !projekti.suunnitteluVaihe,
          content: (
            <SuunnitteluvaiheenVuorovaikuttaminen
              projekti={projekti}
              reloadProjekti={reloadProjekti}
              isDirtyHandler={setIsChildDirty}
              vuorovaikutusnro={vuorovaikutus.vuorovaikutusNumero}
              kirjaamoOsoitteet={kirjaamoOsoitteet || null}
            />
          ),
        };
        tabs.push(tab);
      });
    }
    return tabs;
  }, [projekti, reloadProjekti, kirjaamoOsoitteet]);

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

interface ServerSideProps {
  kirjaamoOsoitteet?: ViranomaisVastaanottajaInput[];
}

export const getServerSideProps: GetServerSideProps<ServerSideProps> = async () => {
  setupLambdaMonitoring();
  const { getSSM } = require("../../../../../backend/src/aws/client");
  const parameterName = "/kirjaamoOsoitteet";
  let kirjaamoOsoitteet: ViranomaisVastaanottajaInput[] = [];
  try {
    const response: GetParameterResult = await getSSM().getParameter({ Name: parameterName }).promise();
    kirjaamoOsoitteet = response.Parameter?.Value ? JSON.parse(response.Parameter.Value) : [];
  } catch (e) {
    log.error(`Could not pass prop 'kirjaamoOsoitteet' to 'aloituskuulutus' page`, e);
  }

  return {
    props: { kirjaamoOsoitteet }, // will be passed to the page component as props
  };
};
