import Button from "@components/button/Button";
import { useRef } from "react";
import { useFormContext } from "react-hook-form";
import Notification, { NotificationType } from "@components/notification/Notification";
import { H3 } from "@components/Headings";
import { HyvaksymisEsitysForm, transformHyvaksymisEsitysFormToTallennaHyvaksymisEsitysInput } from "../hyvaksymisEsitysFormUtil";

export default function AineistonEsikatselu() {
  const hiddenLinkRef = useRef<HTMLAnchorElement | null>();
  const { watch } = useFormContext<HyvaksymisEsitysForm>();
  const formData = watch();

  return (
    <>
      <H3 variant="h2">Hyväksymisesityksen sisällön esikatselu</H3>
      <Notification type={NotificationType.INFO_GRAY}>Esikatsele hyväksymisesitys ennen sen lähettämistä eteenpäin.</Notification>
      <a
        className="hidden"
        id="esikatsele-hyvaksymisesitys-link"
        target="_blank"
        rel="noreferrer"
        href={`/yllapito/projekti/${formData.oid}/esikatsele-hyvaksymisesitys`}
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
            `tallennaHyvaksymisEsitysInput`,
            JSON.stringify(transformHyvaksymisEsitysFormToTallennaHyvaksymisEsitysInput(formData))
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
