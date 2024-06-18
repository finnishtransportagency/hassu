import Notification, { NotificationType } from "@components/notification/Notification";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { getVelhoUrl } from "../util/velhoUtils";
import ExtLink from "./ExtLink";

type Props = { projekti: ProjektiLisatiedolla };

export default function KuntatietoMissingNotification({ projekti }: Props) {
  const velhoURL = getVelhoUrl(projekti.oid)
    return (
      <Notification type={NotificationType.ERROR}>
        Projektilta puuttuu kunta tai maakunta Projektivelhosta. Lisää tiedot Projektivelhoon ja päivitä projektin tiedot &quot;Päivitä
        tiedot&quot; -painikkeella. <ExtLink href={velhoURL}>Projektin sivu Projektivelhossa.</ExtLink>
      </Notification>
    );
}
