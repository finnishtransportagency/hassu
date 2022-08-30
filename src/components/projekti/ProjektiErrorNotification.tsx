import React, { ReactElement, ReactNode, useMemo } from "react";
import { Projekti, ProjektiPaallikkoVirheTyyppi } from "../../../common/graphql/apiModel";
import Notification, { NotificationType } from "@components/notification/Notification";
import { ProjektiSchema, ProjektiTestType } from "src/schemas/projekti";
import { ValidationError } from "yup";
import HassuLink from "@components/HassuLink";
import ExtLink from "@components/ExtLink";

const velhobaseurl = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-";

interface Props {
  validationSchema: ProjektiSchema;
  projekti?: Projekti | null;
}

type ErrorNotification = string | JSX.Element | ReactNode | null;
type ErrorNotificationFunction = (projekti?: Projekti | null) => ErrorNotification;

const projektiErrorToNotificationMap = new Map<ProjektiTestType, ErrorNotificationFunction>([
  [
    ProjektiTestType.PROJEKTI_IS_LOADED,
    () => "Projektin tietoja hakiessa tapahtui virhe. Tarkista tiedot Projektivelhosta ja yritä myöhemmin uudelleen.",
  ],
  [
    ProjektiTestType.PROJEKTI_HAS_PAALLIKKO,
    (projekti) => {
      const virhetieto = projekti?.virhetiedot?.projektipaallikko;
      let message = (
        <p>
          Projektilta puuttuu projektipäällikkö- / vastuuhenkilötieto projektivelhosta. Lisää vastuuhenkilötieto
          projektivelhossa ja yritä projektin perustamista uudelleen.
          <ExtLink href={velhobaseurl + projekti?.oid}>Projektin sivu Projektivelhossa</ExtLink>
        </p>
      );
      if (virhetieto?.tyyppi === ProjektiPaallikkoVirheTyyppi.EI_LOYDY) {
        message = (
          <p>
            {`Projektille asetettua vastuuhenkilön sähköpostia '${
              virhetieto.sahkoposti || ""
            }' ei löydy käyttäjähallinnasta tai kyseinen käyttäjä ei täytä projektipäällikön edellytyksiä. `}
            {"Korjaa vastuuhenkilötieto Projektivelhossa ja yritä projektin perustamista uudelleen."}
            <ExtLink href={velhobaseurl + projekti?.oid}>Projektin sivu Projektivelhossa</ExtLink>
          </p>
        );
      }
      return message;
    },
  ],
  [
    ProjektiTestType.PROJEKTI_IS_CREATED,
    (projekti) => (
      <p>
        {"Projektia ei ole tallennettu. "}
        <HassuLink className="text-primary" href={`/yllapito/perusta/${projekti?.oid}`}>
          Siirry perustamissivulle
        </HassuLink>
        .
      </p>
    ),
  ],
  [
    ProjektiTestType.PROJEKTI_NOT_CREATED,
    (projekti) => (
      <p>
        {"Projekti on jo tallennettu. "}
        <HassuLink className="text-primary" href={`/yllapito/projekti/${projekti?.oid}`}>
          Siirry projektisivulle
        </HassuLink>
        .
      </p>
    ),
  ],
]);

export default function ProjektiErrorNotification({ validationSchema, projekti }: Props): ReactElement {
  const notificationMessage = useMemo<ErrorNotification>(() => {
    try {
      validationSchema.validateSync(projekti);
      return null;
    } catch (err) {
      let message: ErrorNotification = null;
      if (err instanceof ValidationError && Object.values(ProjektiTestType).includes(err.type as ProjektiTestType)) {
        message = projektiErrorToNotificationMap.get(err.type as ProjektiTestType)?.(projekti);
      }
      return message || "Tuntematon virhe projektissa.";
    }
  }, [validationSchema, projekti]);
  return notificationMessage ? <Notification type={NotificationType.ERROR}>{notificationMessage}</Notification> : <></>;
}
