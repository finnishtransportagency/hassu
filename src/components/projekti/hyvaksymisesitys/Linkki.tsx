import TextInput from "@components/form/TextInput";
import SectionContent from "@components/layout/SectionContent";
import { Stack } from "@mui/material";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { useEffect, useMemo, useRef } from "react";
import useSnackbars from "src/hooks/useSnackbars";
import Button from "@components/button/Button";
import { kuntametadata } from "common/kuntametadata";
import Notification, { NotificationType } from "@components/notification/Notification";
import { HyvaksymisesitysLisakentilla, adaptHyvaksymisesitysLisakentillaToHyvaksymisesitysInput } from "./types";

export default function Linkki({
  index,
  projekti,
  kunta,
  uuid,
  formData,
}: Readonly<{
  index: number;
  projekti: ProjektiLisatiedolla;
  kunta?: number;
  uuid: string;
  formData: HyvaksymisesitysLisakentilla;
}>) {
  const linkRef = useRef<HTMLInputElement>(null);

  const lausuntoPyyntoOrTaydennys = kunta ? projekti.lausuntoPyynnonTaydennykset?.[index] : projekti.lausuntoPyynnot?.[index];

  const linkHref = useMemo(() => {
    if (typeof window === "undefined" || !lausuntoPyyntoOrTaydennys) {
      return undefined;
    }
    const address = kunta ? "lausuntopyynnon-taydennysaineistot" : "lausuntopyyntoaineistot";
    return `${window?.location?.protocol}//${window?.location?.host}/suunnitelma/${projekti?.oid}/${address}?hash=${lausuntoPyyntoOrTaydennys?.hash}&uuid=${lausuntoPyyntoOrTaydennys?.uuid}`;
  }, [projekti, lausuntoPyyntoOrTaydennys, kunta]);

  const { showInfoMessage, showErrorMessage } = useSnackbars();

  const title = kunta ? "Lausuntopyynnön täydennykseen liitettävä linkki" : "Lausuntopyyntöön liitettävä linkki";
  const infoText = kunta
    ? "Alle muodostuu linkki lausuntopyynnön täydennyksen aineistoihin. Linkin takana oleva sisältö on koostettu kunnalle kohdistetuista muistutuksista sekä mahdollisista lisäaineistoista. Liitä linkki lausuntopyynnön täydennykseen."
    : "Alle muodostuu linkki lausuntopyynnön aineistoihin. Linkin takana oleva sisältö on koostettu nähtäville asetetuista aineistoista sekä lausuntopyynnön lisäaineistosta. Liitä linkki lausuntopyyntöön.";
  const inputLabel = kunta
    ? "Linkki lausuntopyynnön täydennykseen liitettävään aineistoon"
    : "Linkki lausuntopyyntöön liitettävään aineistoon";

  const buttonDisabled = !projekti.nahtavillaoloVaihe?.aineistoNahtavilla; // Array saa olla tyhjä, mutta sen pitää olla olemassa

  const hiddenLinkRef = useRef<HTMLAnchorElement | null>();

  useEffect(() => {
    const listener = () => {
      localStorage.removeItem(`lausuntoPyyntoInput.${uuid}`);
    };
    window.addEventListener("beforeunload", listener);
    return () => {
      window.removeEventListener("beforeunload", listener);
    };
  }, [uuid]);

  return (
    <SectionContent className="mt-16">
      <h3 className="vayla-subtitle mb-1">{title}</h3>
      <p className="mt-8 mb-8">{infoText}</p>
      {buttonDisabled && (
        <Notification type={NotificationType.WARN}>
          Kuulutukselta suunnitelman nähtäville asettamisesta puuttuuvat aineistot. Lisää aineistot Nähtävilläolo-sivulta.
        </Notification>
      )}
      {kunta && <h4 className="vayla-small-title">{kuntametadata.nameForKuntaId(kunta, "fi")}</h4>}
      <Stack direction="row" alignItems="end">
        <TextInput
          name="linkki"
          label={inputLabel}
          style={{ flexGrow: 1 }}
          disabled
          value={!buttonDisabled ? linkHref || "-" : ""}
          ref={linkRef}
        />
        <a
          className="hidden"
          id={`esikatsele-link-${uuid}`}
          target="_blank"
          rel="noreferrer"
          href={`/yllapito/projekti/${projekti.oid}/lausuntopyynto/esikatsele-${
            kunta ? "lausuntopyynnon-taydennys" : "lausuntopyynto"
          }aineistot?uuid=${uuid}`}
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
          style={{ borderRadius: 0, textTransform: "none" }}
          type="button"
          disabled={buttonDisabled}
          onClick={() => {
            const adaptedInput = adaptHyvaksymisesitysLisakentillaToHyvaksymisesitysInput(formData as HyvaksymisesitysLisakentilla);
            localStorage.setItem(`lausuntoPyyntoInput.${uuid}`, JSON.stringify(adaptedInput));
            if (hiddenLinkRef.current) {
              hiddenLinkRef.current.click();
            }
          }}
        >
          Esikatsele
        </Button>
        <Button
          primary
          style={{ borderRadius: 0, textTransform: "none" }}
          type="button"
          disabled={!linkHref || buttonDisabled}
          onClick={() => {
            if (linkRef.current?.value) {
              navigator.clipboard.writeText(linkRef.current.value);
              showInfoMessage("Kopioitu");
            } else {
              showErrorMessage("Ongelma kopioinnissa");
            }
          }}
        >
          Kopioi linkki
        </Button>
      </Stack>
    </SectionContent>
  );
}
