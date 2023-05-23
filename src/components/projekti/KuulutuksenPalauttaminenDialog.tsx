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
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";

type PalautusValues = {
  syy: string;
};

type Props = {
  setIsFormSubmitting: (isFormSubmitting: boolean) => void;
  projekti: ProjektiLisatiedolla;
  open: boolean;
  onClose: () => void;
  tilasiirtymaTyyppi: TilasiirtymaTyyppi;
};

export default function KuulutuksenPalauttaminenDialog({ open, onClose, projekti, setIsFormSubmitting, tilasiirtymaTyyppi }: Props) {
  const api = useApi();
  const { mutate: reloadProjekti } = useProjekti();
  const { showSuccessMessage } = useSnackbars();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PalautusValues>({ defaultValues: { syy: "" } });

  const vaihdaAloituskuulutuksenTila = useCallback(
    async (toiminto: TilasiirtymaToiminto, syy?: string) => {
      if (!projekti) {
        return;
      }
      setIsFormSubmitting(true);
      try {
        await api.siirraTila({ oid: projekti.oid, toiminto, syy, tyyppi: tilasiirtymaTyyppi });
        await reloadProjekti();
        showSuccessMessage(`Kuulutuksen palautus onnistui`);
      } catch (error) {
        log.error(error);
      }
      setIsFormSubmitting(false);
      onClose();
    },
    [projekti, setIsFormSubmitting, onClose, api, tilasiirtymaTyyppi, reloadProjekti, showSuccessMessage]
  );

  const palautaMuokattavaksi = useCallback(
    async (data: PalautusValues) => {
      log.debug("palauta muokattavaksi: ", data);
      await vaihdaAloituskuulutuksenTila(TilasiirtymaToiminto.HYLKAA, data.syy);
    },
    [vaihdaAloituskuulutuksenTila]
  );

  const palautaMuokattavaksiJaPoistu = useCallback(
    async (data: PalautusValues) => {
      log.debug("palauta muokattavaksi ja poistu: ", data);
      await palautaMuokattavaksi(data);
      const siirtymaTimer = setTimeout(() => {
        setIsFormSubmitting(true);
        router.push(`/yllapito/projekti/${projekti?.oid}`);
      }, 1000);
      return () => {
        setIsFormSubmitting(false);
        clearTimeout(siirtymaTimer);
      };
    },
    [palautaMuokattavaksi, setIsFormSubmitting, router, projekti?.oid]
  );

  return (
    <div>
      <HassuDialog open={open} title="Kuulutuksen palauttaminen" onClose={onClose}>
        <form>
          <HassuStack>
            <p>
              Olet palauttamassa kuulutuksen korjattavaksi. Kuulutuksen tekijä saa tiedon palautuksesta ja sen syystä. Saat ilmoituksen, kun
              kuulutus on taas valmis hyväksyttäväksi. Jos haluat itse muokata kuulutusta ja hyväksyä sen tehtyjen muutoksien jälkeen,
              valitse Palauta ja siirry muokkaamaan.
            </p>
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
              Palauta ja muokkaa
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
