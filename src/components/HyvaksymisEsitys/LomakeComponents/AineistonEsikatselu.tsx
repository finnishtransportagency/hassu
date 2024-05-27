import Button from "@components/button/Button";
import Section from "@components/layout/Section2";
import { TallennaHyvaksymisEsitysInput } from "@services/api";
import { useRef } from "react";
import { useFormContext } from "react-hook-form";
import Notification, { NotificationType } from "@components/notification/Notification";

export default function AineistonEsikatselu() {
  const hiddenLinkRef = useRef<HTMLAnchorElement | null>();
  const { watch } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const formData = watch();

  return (
    <Section>
      <h3 className="vayla-subtitle">Hyväksymisesityksen sisällön esikatselu</h3>
      <Notification type={NotificationType.INFO_GRAY}>Esikatsele hyväksymisesitys ennen sen lähettämistä eteenpäin.</Notification>
      <a
        className="hidden"
        id={`esikatsele-hyvaksymisesitys-link`}
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
          localStorage.setItem(`tallennaHyvaksymisEsitysInput`, JSON.stringify(formData));
          if (hiddenLinkRef.current) {
            hiddenLinkRef.current.click();
          }
        }}
      >
        Aineiston esikatselu
      </Button>
    </Section>
  );
}
