import { Container } from "@mui/material";
import React, { ReactElement, useCallback } from "react";
import useTranslation from "next-translate/useTranslation";
import { HeaderProps } from "./header";
import { useRouter } from "next/router";
import Button from "@components/button/Button";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { Kieli } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";

export function KansalaisHeader({}: HeaderProps): ReactElement {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { data: projekti } = useProjektiJulkinen();
  const { showInfoMessage } = useSnackbars();

  const replacer = useCallback(
    (_substring: string, key: string, _offset: number, _string: number): string => {
      const returned: string =
        router.query[key.replace(/[\[\]]/, "")] !== undefined
          ? router.query[key.replace(/[\[\]]/, "")]?.toString() || key
          : key;
      return returned;
    },
    [router]
  );

  return (
    <Container>
      <div className="bg-gray-light py-4 pl-4">
        {t("kansalaisheader")}
        <Button
          className="inline m-3"
          onClick={() => router.push(router.pathname.replace(/\[(.*)\]/, replacer), undefined, { locale: "fi" })}
        >
          Suomeksi
        </Button>
        <Button
          className="inline m-3"
          onClick={() => {
            if (
              projekti &&
              projekti.kielitiedot?.ensisijainenKieli !== Kieli.RUOTSI &&
              projekti.kielitiedot?.toissijainenKieli !== Kieli.RUOTSI
            ) {
              showInfoMessage("RUOTSIKSI Projektia ei ole saatavilla ruotsin kielellä");
              return router.push("/", undefined, { locale: "sv" });
            }
            router.push(router.pathname.replace(/\[(.*)\]/, replacer), undefined, { locale: "sv" });
          }}
        >
          Ruotsiksi
        </Button>
      </div>
    </Container>
  );
}

export default KansalaisHeader;
