import Button from "@components/button/Button";
import Section from "@components/layout/Section";
import { Stack } from "@mui/material";
import { KuulutusJulkaisuTila, MuokkausTila, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "@services/api";
import log from "loglevel";
import React, { useCallback, useState } from "react";
import { FieldPath, useFormContext } from "react-hook-form";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import { KuulutuksenTiedotFormValues } from "./KuulutuksenTiedot";
import useApi from "src/hooks/useApi";
import useIsProjektiReadyForTilaChange from "../../../../hooks/useProjektinTila";
import { nahtavillaoloKuulutusSchema } from "src/schemas/nahtavillaoloKuulutus";
import { ValidationError } from "yup";
import { lataaTiedosto } from "../../../../util/fileUtil";
import KuulutuksenPalauttaminenDialog from "@components/projekti/KuulutuksenPalauttaminenDialog";
import KuulutuksenHyvaksyminenDialog from "@components/projekti/KuulutuksenHyvaksyminenDialog";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";

interface Props {
  projekti: ProjektiLisatiedolla;
}

export default function Painikkeet({ projekti }: Props) {
  const { mutate: reloadProjekti } = useProjekti();
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const [isOpenPalauta, setIsOpenPalauta] = useState(false);
  const [isOpenHyvaksy, setIsOpenHyvaksy] = useState(false);

  const { withLoadingSpinner } = useLoadingSpinner();

  const { handleSubmit, trigger, setError, getValues, watch } = useFormContext<KuulutuksenTiedotFormValues>();

  const api = useApi();

  const talletaTiedosto = useCallback(async (tiedosto: File) => lataaTiedosto(api, tiedosto), [api]);
  const closePalauta = useCallback(() => {
    setIsOpenPalauta(false);
  }, []);

  const openPalauta = useCallback(() => {
    setIsOpenPalauta(true);
  }, []);

  const closeHyvaksy = useCallback(() => {
    setIsOpenHyvaksy(false);
  }, []);

  const openHyvaksy = useCallback(() => {
    setIsOpenHyvaksy(true);
  }, []);

  const saveNahtavillaolo = useCallback(
    async (formData: KuulutuksenTiedotFormValues) => {
      const pohjoisSaameIlmoitusPdf = formData.nahtavillaoloVaihe.nahtavillaoloSaamePDFt?.POHJOISSAAME
        ?.kuulutusIlmoitusPDFPath as unknown as File | undefined | string;
      if (
        formData.nahtavillaoloVaihe.nahtavillaoloSaamePDFt?.POHJOISSAAME?.kuulutusIlmoitusPDFPath &&
        pohjoisSaameIlmoitusPdf instanceof File
      ) {
        formData.nahtavillaoloVaihe.nahtavillaoloSaamePDFt.POHJOISSAAME.kuulutusIlmoitusPDFPath = await talletaTiedosto(
          pohjoisSaameIlmoitusPdf
        );
      }
      const pohjoisSaameKuulutusPdf = formData.nahtavillaoloVaihe.nahtavillaoloSaamePDFt?.POHJOISSAAME?.kuulutusPDFPath as unknown as
        | File
        | undefined
        | string;
      if (formData.nahtavillaoloVaihe.nahtavillaoloSaamePDFt?.POHJOISSAAME?.kuulutusPDFPath && pohjoisSaameKuulutusPdf instanceof File) {
        formData.nahtavillaoloVaihe.nahtavillaoloSaamePDFt.POHJOISSAAME.kuulutusPDFPath = await talletaTiedosto(pohjoisSaameKuulutusPdf);
      }
      await api.tallennaProjekti(formData);
      if (reloadProjekti) {
        await reloadProjekti();
      }
    },
    [api, reloadProjekti, talletaTiedosto]
  );

  const saveDraft = useCallback(
    (formData: KuulutuksenTiedotFormValues) =>
      withLoadingSpinner(
        (async () => {
          try {
            await saveNahtavillaolo(formData);
            showSuccessMessage("Tallennus onnistui");
          } catch (e) {
            log.error("OnSubmit Error", e);
          }
        })()
      ),
    [saveNahtavillaolo, showSuccessMessage, withLoadingSpinner]
  );

  const vaihdaNahtavillaolonTila = useCallback(
    (toiminto: TilasiirtymaToiminto, viesti: string, syy?: string) =>
      withLoadingSpinner(
        (async () => {
          if (!projekti) {
            return;
          }
          try {
            await api.siirraTila({ oid: projekti.oid, toiminto, syy, tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO });
            await reloadProjekti();
            showSuccessMessage(`${viesti} onnistui`);
          } catch (error) {
            log.error(error);
          }
          setIsOpenPalauta(false);
          setIsOpenHyvaksy(false);
        })()
      ),
    [api, projekti, reloadProjekti, showSuccessMessage, withLoadingSpinner]
  );

  const lahetaHyvaksyttavaksi = useCallback(
    () =>
      withLoadingSpinner(
        (async () => {
          const formData = getValues();
          try {
            await nahtavillaoloKuulutusSchema.validate(formData, {
              context: { projekti, applyLahetaHyvaksyttavaksiChecks: true },
              abortEarly: false,
            });
          } catch (error) {
            if (error instanceof ValidationError) {
              const errorArray = error.inner.length ? error.inner : [error];
              errorArray.forEach((err) => {
                const { type, path, message } = err;
                if (path) {
                  setError(path as FieldPath<KuulutuksenTiedotFormValues>, { type, message });
                }
              });
            }
            return;
          }
          log.debug("tallenna tiedot ja lähetä hyväksyttäväksi");
          try {
            await saveNahtavillaolo(formData);
            await vaihdaNahtavillaolonTila(TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI, "Lähetys");
          } catch (error) {
            log.error("Virhe hyväksyntään lähetyksessä", error);
          }
        })()
      ),
    [withLoadingSpinner, getValues, projekti, setError, saveNahtavillaolo, vaihdaNahtavillaolonTila]
  );

  const handleClickOpenHyvaksy = useCallback(async () => {
    const result = await trigger("nahtavillaoloVaihe.kuulutusPaiva");

    if (result) {
      openHyvaksy();
    } else {
      showErrorMessage("Kuulutuspäivämärä on menneisyydessä tai virheellinen. Palauta kuulutus muokattavaksi ja korjaa päivämäärä.");
    }
  }, [openHyvaksy, showErrorMessage, trigger]);

  const voiMuokata = !projekti?.nahtavillaoloVaihe?.muokkausTila || projekti?.nahtavillaoloVaihe?.muokkausTila === MuokkausTila.MUOKKAUS;

  const voiHyvaksya =
    projekti.nahtavillaoloVaiheJulkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA &&
    projekti?.nykyinenKayttaja.onProjektipaallikkoTaiVarahenkilo;

  const isProjektiReadyForTilaChange = useIsProjektiReadyForTilaChange(projekti);

  const kuntavastaanottajat = watch("nahtavillaoloVaihe.ilmoituksenVastaanottajat.kunnat");
  const kunnatPuuttuu = !(kuntavastaanottajat && kuntavastaanottajat.length > 0);

  return (
    <>
      {!!voiHyvaksya && (
        <Section noDivider>
          <Stack direction={["column", "column", "row"]} justifyContent={[undefined, undefined, "flex-end"]}>
            <Button type="button" id="button_reject" onClick={openPalauta}>
              Palauta
            </Button>
            <Button type="button" id="button_open_acceptance_dialog" primary onClick={handleClickOpenHyvaksy}>
              Hyväksy ja lähetä
            </Button>
          </Stack>
        </Section>
      )}
      {!!voiMuokata && (
        <>
          <Section noDivider>
            <Stack justifyContent={{ md: "flex-end" }} direction={{ xs: "column", md: "row" }}>
              <Button id="save_nahtavillaolovaihe_draft" onClick={handleSubmit(saveDraft)}>
                Tallenna Luonnos
              </Button>
              <Button
                type="button"
                disabled={!isProjektiReadyForTilaChange || kunnatPuuttuu}
                id="save_and_send_for_acceptance"
                primary
                onClick={lahetaHyvaksyttavaksi}
              >
                Lähetä Hyväksyttäväksi
              </Button>
            </Stack>
          </Section>
        </>
      )}
      <KuulutuksenPalauttaminenDialog
        open={isOpenPalauta}
        projekti={projekti}
        onClose={closePalauta}
        tilasiirtymaTyyppi={TilasiirtymaTyyppi.NAHTAVILLAOLO}
      />
      <KuulutuksenHyvaksyminenDialog
        open={isOpenHyvaksy}
        projekti={projekti}
        onClose={closeHyvaksy}
        tilasiirtymaTyyppi={TilasiirtymaTyyppi.NAHTAVILLAOLO}
      />
    </>
  );
}
