import React, { FC } from "react";
import useTranslation from "next-translate/useTranslation";
import { useRouter } from "next/router";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { Kieli } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import setLanguage from "next-translate/setLanguage";

const KansalaisHeaderTopRightContent: FC = () => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { data: projekti } = useProjektiJulkinen();
  const { showInfoMessage } = useSnackbars();

  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-3 py-5 md:py-0 vayla-paragraph">
      <span
        className={router.locale === "fi" ? undefined : "text-primary-dark"}
        style={{ cursor: "pointer" }}
        onClick={async () => await setLanguage("fi", false)}
      >
        Suomi
      </span>
      <span
        className={router.locale === "sv" ? undefined : "text-primary-dark"}
        style={{ cursor: "pointer" }}
        onClick={async () => {
          if (
            projekti &&
            projekti.kielitiedot?.ensisijainenKieli !== Kieli.RUOTSI &&
            projekti.kielitiedot?.toissijainenKieli !== Kieli.RUOTSI
          ) {
            showInfoMessage(t("commonSV:projekti_ei_ruotsin_kielella"));
            return router.push("/", undefined, { locale: "sv" });
          }
          await setLanguage("sv", false);
        }}
      >
        Svenska
      </span>
    </div>
  );
};

export default KansalaisHeaderTopRightContent;
