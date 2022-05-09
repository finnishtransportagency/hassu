import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import React, { ReactElement } from "react";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import HassuDialog from "@components/HassuDialog";
import WindowCloseButton from "@components/button/WindowCloseButton";
import useTranslation from "next-translate/useTranslation";
import {
  IlmoituksenVastaanottajatInput,
} from "@services/api";

interface Props {
  ilmoituksenVastaanottajat: IlmoituksenVastaanottajatInput | null | undefined;
  dialogiOnAuki: boolean;
  onClose: () => void;
  tallenna: (e?: React.BaseSyntheticEvent<object, any, any> | undefined) => Promise<void>;
  julkinen: boolean;
}


export default function HyvaksymisDialogi({
  ilmoituksenVastaanottajat,
  dialogiOnAuki,
  onClose,
  tallenna,
  julkinen
}: Props): ReactElement {
  const { t } = useTranslation();

  return (
    <HassuDialog open={dialogiOnAuki} onClose={onClose}>
      <Section noDivider smallGaps>
        <SectionContent>
          <div className="vayla-dialog-title flex">
            <div className="flex-grow">Kuulutuksen hyväksyminen ja ilmoituksen lähettäminen</div>
            <div className="justify-end">
              <WindowCloseButton
                onClick={() => {
                  onClose();
                }}
              ></WindowCloseButton>
            </div>
          </div>
        </SectionContent>
        <SectionContent>
          <div className="vayla-dialog-content">
            <form>
              {julkinen
                ? <p>Olet päivittämässä vuorovaikutustietoja. Ilmoitus päivitetyistä tiedoista lähetetään seuraaville:</p>
                : <p>
                    Olet tallentamassa vuorovaikutustiedot ja käynnistämässä siihen liittyvän ilmoituksen automaattisen
                    lähettämisen. Ilmoitus vuorovaikutuksesta lähetetään seuraaville:
                  </p>
              }
              <div className="content">
                <p>Viranomaiset</p>
                <ul className="vayla-dialog-list">
                  {ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) => (
                    <li key={viranomainen.nimi}>
                      {t(`common:viranomainen.${viranomainen.nimi}`)}, {viranomainen.sahkoposti}
                    </li>
                  ))}
                </ul>
                <p>Kunnat</p>
                <ul className="vayla-dialog-list">
                  {ilmoituksenVastaanottajat?.kunnat?.map((kunta) => (
                    <li key={kunta.nimi}>
                      {kunta.nimi}, {kunta.sahkoposti}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="content">
                {julkinen
                  ? <p>Ilmoitukset lähetetään automaattisesti painikkeen klikkaamisen jälkeen.</p>
                  : <p>
                      Klikkaamalla Tallenna ja lähetä -painiketta vahvistat vuorovaikutustiedot tarkastetuksi ja
                      hyväksyt sen julkaisun asetettuna julkaisupäivänä sekä ilmoituksien lähettämisen. Ilmoitukset
                      lähetetään automaattisesti painikkeen klikkaamisen jälkeen.
                    </p>
                }
              </div>
              <HassuStack
                direction={["column", "column", "row"]}
                justifyContent={[undefined, undefined, "flex-end"]}
                paddingTop={"1rem"}
              >
                <Button primary onClick={tallenna}>
                  Hyväksy ja lähetä
                </Button>
                <Button
                  onClick={(e) => {
                    onClose();
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
  );
}