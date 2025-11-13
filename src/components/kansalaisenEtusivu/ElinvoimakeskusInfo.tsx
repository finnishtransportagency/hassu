import Notification, { NotificationType } from "@components/notification/Notification";
import { DottedList } from "@components/notification/DottedList";
import { isEvkAktivoitu } from "common/util/isEvkAktivoitu";
import StyledLink from "@components/StyledLink";
import { H3 } from "@components/Headings";
import useTranslation from "next-translate/useTranslation";

interface EVKinfoProps {
  onClose: () => void;
  open: boolean;
}

export const EVKinfo = ({ onClose, open }: EVKinfoProps) => {
  const { t } = useTranslation("etusivu");

  return (
    <Notification closable open={open} onClose={onClose} type={NotificationType.INFO} style={{ marginBottom: 20, marginTop: 20 }}>
      <div>
        <H3 variant="h4">{t(`etusivu:evk-tiedote-otsikko${isEvkAktivoitu() ? "" : "_2025"}`)}</H3>
        <DottedList className="list-disc block pl-5">
          <li>{t(`etusivu:evk-tiedote${isEvkAktivoitu() ? "" : "_2025"}`)}</li>
          <li>
            <StyledLink href={isEvkAktivoitu() ? t("etusivu:evk-linkki") : t("etusivu:ely-linkki")} target="blank">
              {t("etusivu:lue-lisaa")}
            </StyledLink>
          </li>
        </DottedList>
      </div>
    </Notification>
  );
};
