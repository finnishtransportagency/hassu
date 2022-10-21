import Textarea from "@components/form/Textarea";
import React from "react";
import Button from "@components/button/Button";
import { DialogActions, DialogContent } from "@mui/material";
import HassuDialog from "@components/HassuDialog";
import HassuStack from "@components/layout/HassuStack";
import { useForm } from "react-hook-form";
import { Projekti } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import { kuntametadata } from "../../../../../common/kuntametadata";

type PalautusValues = {
  syy: string;
};

interface Props {
  projekti: Projekti;
  open: boolean;
  openHyvaksy: boolean;
  setOpen: (a: boolean) => void;
  setOpenHyvaksy: (a: boolean) => void;
  hyvaksyKuulutus: () => void;
  palautaMuokattavaksiJaPoistu: (data: PalautusValues) => Promise<() => void>;
  palautaMuokattavaksi: (data: PalautusValues) => Promise<void>;
}

export default function NahtavillaoloPainikkeet({
  projekti,
  open,
  openHyvaksy,
  setOpen,
  setOpenHyvaksy,
  hyvaksyKuulutus,
  palautaMuokattavaksiJaPoistu,
  palautaMuokattavaksi,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PalautusValues>({ defaultValues: { syy: "" } });

  const { t, lang } = useTranslation("commonFI");

  return (
    <>
      <div>
        <HassuDialog open={open} title="Kuulutuksen palauttaminen" onClose={() => setOpen(false)}>
          <form>
            <HassuStack>
              <p>
                Olet palauttamassa kuulutuksen korjattavaksi. Kuulutuksen tekijä saa tiedon palautuksesta ja sen syystä. Saat ilmoituksen,
                kun kuulutus on taas valmis hyväksyttäväksi. Jos haluat itse muokata kuulutusta ja hyväksyä tehtyjen muutoksien jälkeen,
                valitse Palauta ja muokkaa.
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
              <Button
                onClick={(e) => {
                  setOpen(false);
                  e.preventDefault();
                }}
              >
                Peruuta
              </Button>
            </HassuStack>
          </form>
        </HassuDialog>
      </div>
      <div>
        <HassuDialog
          title="Kuulutuksen hyväksyminen ja ilmoituksen lähettäminen"
          hideCloseButton
          open={openHyvaksy}
          onClose={() => setOpenHyvaksy(false)}
        >
          <form style={{ display: "contents" }}>
            <DialogContent>
              <p>
                Olet hyväksymässä kuulutuksen ja käynnistämässä siihen liittyvän ilmoituksen automaattisen lähettämisen. Ilmoitus
                kuulutuksesta lähetetään seuraaville:
              </p>
              <div>
                <p>Viranomaiset</p>
                <ul className="vayla-dialog-list">
                  {projekti?.nahtavillaoloVaihe?.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) => (
                    <li key={viranomainen.nimi}>
                      {t(`viranomainen.${viranomainen.nimi}`)}, {viranomainen.sahkoposti}
                    </li>
                  ))}
                </ul>
                <p>Kunnat</p>
                <ul className="vayla-dialog-list">
                  {projekti?.nahtavillaoloVaihe?.ilmoituksenVastaanottajat?.kunnat?.map((kunta) => (
                    <li key={kunta.id}>
                      {kuntametadata.nameForKuntaId(kunta.id, lang)}, {kunta.sahkoposti}
                    </li>
                  ))}
                </ul>
              </div>
              <p>
                Jos nähtävilläolovaiheen kuulutukseen pitää tehdä muutoksia hyväksymisen jälkeen, tulee nähtävilläolovaihekuulutus avata
                uudelleen ja lähettää päivitetyt ilmoitukset asianosaisille. Kuulutuspäivän jälkeen tulevat muutostarpeet vaativat
                aloituksen uudelleen kuuluttamisen.
              </p>
              <p>
                Klikkaamalla Hyväksy ja lähetä -painiketta vahvistat kuulutuksen tarkastetuksi ja hyväksyt sen julkaisun kuulutuspäivänä
                sekä ilmoituksien lähettämisen. Ilmoitukset lähetetään automaattisesti painikkeen klikkaamisen jälkeen.
              </p>
            </DialogContent>
            <DialogActions>
              <Button id="accept_kuulutus" primary onClick={hyvaksyKuulutus}>
                Hyväksy ja lähetä
              </Button>
              <Button
                onClick={(e) => {
                  setOpenHyvaksy(false);
                  e.preventDefault();
                }}
              >
                Peruuta
              </Button>
            </DialogActions>
          </form>
        </HassuDialog>
      </div>
    </>
  );
}
