import HassuDialog from "@components/HassuDialog";
import Button from "@components/button/Button";
import Textarea from "@components/form/Textarea";
import HassuStack from "@components/layout/HassuStack";
import { TilasiirtymaToiminto, TilasiirtymaTyyppi } from "@services/api";
import log from "loglevel";
import { useRouter } from "next/router";
import React, { useCallback } from "react";
import { useForm } from "react-hook-form";
import useApi from "src/hooks/useApi";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import useSnackbars from "src/hooks/useSnackbars";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";

type PalautusValues = {
  syy: string;
};

type Props = {
  projekti: ProjektiLisatiedolla;
  open: boolean;
  onClose: () => void;
  tilasiirtymaTyyppi: Exclude<TilasiirtymaTyyppi, TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS>;
  isAineistoMuokkaus: boolean;
};

export default function KuulutuksenPalauttaminenDialog({ open, onClose, projekti, isAineistoMuokkaus, tilasiirtymaTyyppi }: Props) {
  const api = useApi();
  const { mutate: reloadProjekti } = useProjekti();
  const { showSuccessMessage } = useSnackbars();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PalautusValues>({ defaultValues: { syy: "" } });

  const { withLoadingSpinner } = useLoadingSpinner();

  const vaihdaAloituskuulutuksenTila = useCallback(
    (toiminto: TilasiirtymaToiminto, syy?: string) =>
      withLoadingSpinner(
        (async () => {
          if (!projekti) {
            return;
          }
          try {
            await api.siirraTila({ oid: projekti.oid, toiminto, syy, tyyppi: tilasiirtymaTyyppi });
            await reloadProjekti();
            showSuccessMessage(`Kuulutuksen palautus onnistui`);
          } catch (error) {
            log.error(error);
          }
          onClose();
        })()
      ),
    [withLoadingSpinner, projekti, onClose, api, tilasiirtymaTyyppi, reloadProjekti, showSuccessMessage]
  );

  const palautaMuokattavaksi = useCallback(
    async (data: PalautusValues) => {
      log.debug("palauta muokattavaksi: ", data);
      await vaihdaAloituskuulutuksenTila(TilasiirtymaToiminto.HYLKAA, data.syy);
    },
    [vaihdaAloituskuulutuksenTila]
  );

  const palautaMuokattavaksiJaPoistu = useCallback(
    async (data: PalautusValues) =>
      await withLoadingSpinner(
        (async () => {
          log.debug("palauta muokattavaksi ja poistu: ", data);
          await palautaMuokattavaksi(data);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await router.push(`/yllapito/projekti/${projekti?.oid}`);
        })()
      ),
    [withLoadingSpinner, palautaMuokattavaksi, router, projekti?.oid]
  );

  return (
    <div>
      <HassuDialog
        open={open}
        title={isAineistoMuokkaus ? "Kuulutuksen aineistojen palauttaminen tai muokkaaminen" : "Kuulutuksen palauttaminen"}
        onClose={onClose}
      >
        <form>
          <HassuStack>
            {isAineistoMuokkaus ? (
              <p>
                Olet palauttamassa kuulutuksen aineistoa korjattavaksi. Muokkausten tekijä saa tiedon palautuksesta ja sen syystä. Saat
                ilmoituksen, kun kuulutuksen aineisto on taas valmis hyväksyttäväksi. Jos haluat itse muokata aineistoa ja hyväksyä sen
                muutosten tekemisen jälkeen, valitse Siirry muokkaamaan.
              </p>
            ) : (
              <p>
                Olet palauttamassa kuulutuksen korjattavaksi. Kuulutuksen tekijä saa tiedon palautuksesta ja sen syystä. Saat ilmoituksen,
                kun kuulutus on taas valmis hyväksyttäväksi. Jos haluat itse muokata kuulutusta ja hyväksyä sen tehtyjen muutoksien jälkeen,
                valitse Palauta ja siirry muokkaamaan.
              </p>
            )}
            <Textarea
              label="Syy palautukselle *"
              {...register("syy", { required: "Palautuksen syy täytyy antaa" })}
              error={errors.syy}
              maxLength={200}
              hideLengthCounter={false}
            ></Textarea>
          </HassuStack>
          <HassuStack direction={["column", "column", "row"]} justifyContent={[undefined, undefined, "flex-end"]} paddingTop={"1rem"}>
            <Button primary onClick={handleSubmit(palautaMuokattavaksiJaPoistu)}>
              Palauta ja poistu
            </Button>
            <Button id="reject_and_edit" onClick={handleSubmit(palautaMuokattavaksi)}>
              Siirry muokkaamaan
            </Button>
            <Button type="button" onClick={onClose}>
              Peruuta
            </Button>
          </HassuStack>
        </form>
      </HassuDialog>
    </div>
  );
}
