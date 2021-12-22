import React, { ReactElement, ReactNode, useState } from "react";
import { Projekti } from "../../../common/graphql/apiModel";
import Notification, { NotificationType } from "@components/notification/Notification";
import { ProjektiSchema, ProjektiTestType } from "src/schemas/projekti";
import { ValidationError } from "yup";
import { useEffect } from "react";
import HassuLink from "@components/HassuLink";
import ExtLink from "@components/ExtLink";

const velhobaseurl = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-";

interface Props {
  validationSchema: ProjektiSchema;
  projekti?: Projekti | null;
  disableValidation?: boolean;
}

type ErrorNotification = string | JSX.Element | ReactNode | null;
type ErrorNotificationFunction = (projekti?: Projekti | null) => ErrorNotification;

const projektiErrorToNotificationMap = new Map<ProjektiTestType, ErrorNotificationFunction>([
  [
    ProjektiTestType.PROJEKTI_IS_LOADED,
    () => "Projektin tietoja hakiessa tapahtui virhe. Tarkista tiedot velhosta ja yritä myöhemmin uudelleen.",
  ],
  [
    ProjektiTestType.PROJEKTI_HAS_PAALLIKKO,
    (projekti) => (
      <p>
        Projektilta puuttuu projektipäällikkö- / vastuuhenkilötieto projektivelhosta. Lisää vastuuhenkilötieto
        projektivelhossa ja yritä projektin perustamista uudelleen.
        <ExtLink href={velhobaseurl + projekti?.oid}>Projektin sivu Projektivelhossa</ExtLink>
      </p>
    ),
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

export default function ProjektiErrorNotification({
  validationSchema,
  projekti,
  disableValidation,
}: Props): ReactElement {
  const [notificationMessage, setNotificationMessage] = useState<ErrorNotification>(null);

  useEffect(() => {
    try {
      if (!disableValidation) {
        validationSchema.validateSync(projekti);
      }
      setNotificationMessage(null);
    } catch (err) {
      let message: ErrorNotification;
      if (err instanceof ValidationError && Object.values(ProjektiTestType).includes(err.type as ProjektiTestType)) {
        message = projektiErrorToNotificationMap.get(err.type as ProjektiTestType)?.(projekti);
      }
      setNotificationMessage(message || "Tuntematon virhe projektissa.");
    }
  }, [disableValidation, validationSchema, projekti]);
  return notificationMessage ? <Notification type={NotificationType.ERROR}>{notificationMessage}</Notification> : <></>;
}
