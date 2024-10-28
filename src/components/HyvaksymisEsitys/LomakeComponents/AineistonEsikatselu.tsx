import Button from "@components/button/Button";
import { useRef } from "react";
import { useFormContext } from "react-hook-form";
import Notification, { NotificationType } from "@components/notification/Notification";
import { H3 } from "@components/Headings";
import {
  EnnakkoneuvotteluForm,
  HyvaksymisEsitysForm,
  transformHyvaksymisEsitysFormToTallennaHyvaksymisEsitysInput,
  transformToInput,
} from "../hyvaksymisEsitysFormUtil";
import { HyvaksymisEsitysEnnakkoNeuvotteluProps } from "./LinkinVoimassaoloaika";

export default function AineistonEsikatselu({ ennakkoneuvottelu }: Readonly<HyvaksymisEsitysEnnakkoNeuvotteluProps>) {
  const hiddenLinkRef = useRef<HTMLAnchorElement | null>();
  const { watch } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  const formData = watch();

  return (
    <>
      <H3 variant="h2">
        {ennakkoneuvottelu ? "Ennakkoneuvotteluun toimitettavan suunnitelman" : "Hyväksymisesityksen"} sisällön esikatselu
      </H3>
      <Notification type={NotificationType.INFO_GRAY}>
        {ennakkoneuvottelu
          ? "Esikatsele ennakkoneuvottelumateriaali ennen sen lähettämistä eteenpäin."
          : "Esikatsele hyväksymisesitys ennen sen lähettämistä eteenpäin."}
      </Notification>
      <a
        className="hidden"
        id="esikatsele-hyvaksymisesitys-link"
        target="_blank"
        rel="noreferrer"
        href={`/yllapito/projekti/${formData.oid}/esikatsele-${ennakkoneuvottelu ? "ennakkoneuvottelu" : "hyvaksymisesitys"}`}
        ref={(e) => {
          if (hiddenLinkRef) {
            hiddenLinkRef.current = e;
          }
        }}
      >
        Hidden link
      </a>
      <Button
        endIcon="external-link-alt"
        type="button"
        onClick={() => {
          localStorage.setItem(
            ennakkoneuvottelu ? "tallennaEnnakkoNeuvotteluInput" : "tallennaHyvaksymisEsitysInput",
            JSON.stringify(
              ennakkoneuvottelu ? transformToInput(formData, false) : transformHyvaksymisEsitysFormToTallennaHyvaksymisEsitysInput(formData)
            )
          );
          if (hiddenLinkRef.current) {
            hiddenLinkRef.current.click();
          }
        }}
      >
        Aineiston esikatselu
      </Button>
    </>
  );
}
