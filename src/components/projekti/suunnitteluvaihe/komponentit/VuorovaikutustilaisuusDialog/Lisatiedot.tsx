import React, { ReactElement, useCallback, useState } from "react";
import TextInput from "@components/form/TextInput";
import { useFormContext } from "react-hook-form";
import lowerCase from "lodash/lowerCase";
import { KaannettavaKieli } from "common/kaannettavatKielet";
import { VuorovaikutustilaisuusFormValues } from ".";
import { Label } from "@components/form/FormGroup";
import Notification, { NotificationType } from "../../../../notification/Notification";
import InfoIcon from "@mui/icons-material/Info";
import { VuorovaikutusTilaisuusTyyppi } from "@services/api";

interface Props {
  index: number;
  ensisijainenKaannettavaKieli: KaannettavaKieli | null;
  toissijainenKaannettavaKieli: KaannettavaKieli | null;
  tilaisuustyyppi: VuorovaikutusTilaisuusTyyppi;
}

function getText(tyyppi: VuorovaikutusTilaisuusTyyppi) {
  switch (tyyppi) {
    case VuorovaikutusTilaisuusTyyppi.PAIKALLA:
      return (
        "Lisätiedot-kenttään voit kirjoittaa tietoja mm. kahvitustilaisuudesta tai " +
        "saapumisohjeista. Lisätiedot näkyvät palvelun julkisella puolella sekä kutsulla. " +
        "Kutsun julkaisun jälkeen tehdyt muutokset tulevat näkyviin vain palvelun julkiselle puolelle."
      );
    case VuorovaikutusTilaisuusTyyppi.SOITTOAIKA:
      return (
        "Lisätiedot-kenttään voit kirjoittaa tietoja mm. kehen olla yhteydessä missäkin asiassa. " +
        "Lisätiedot näkyvät palvelun julkisella puolella sekä kutsulla. Kutsun julkaisun jälkeen tehdyt " +
        "muutokset tulevat näkyviin vain palvelun julkiselle puolelle."
      );
    case VuorovaikutusTilaisuusTyyppi.VERKOSSA:
      return (
        "Lisätiedot-kenttään voit kirjoittaa tietoja mm. siitä miten tilaisuus etenee " +
        "ja ketkä ovat mukana tilaisuudessa esittelemässä suunnitelmaa. Lisätiedot näkyvät " +
        "palvelun julkisella puolella sekä kutsulla. Kutsun julkaisun jälkeen tehdyt muutokset " +
        "tulevat näkyviin vain palvelun julkiselle puolelle."
      );
    default:
      return "";
  }
}

function LabelJaNappi({
  openNotification,
  setOpenNotification,
}: {
  openNotification: boolean;
  setOpenNotification: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <Label style={{ fontSize: "1em " }}>
      <span>Lisätiedot</span>
      <InfoIcon
        onClick={() => setOpenNotification(true)}
        className="ml-2"
        style={{ color: "#0064af", width: "0.75em", paddingBottom: "0.1em", cursor: openNotification ? "default" : "pointer" }}
      />
    </Label>
  );
}

function Infobox({
  openNotification,
  setOpenNotification,
  tilaisuustyyppi,
}: {
  openNotification: boolean;
  setOpenNotification: React.Dispatch<React.SetStateAction<boolean>>;
  tilaisuustyyppi: VuorovaikutusTilaisuusTyyppi;
}) {
  const onClose = useCallback(() => {
    setOpenNotification(false);
  }, [setOpenNotification]);
  return (
    <Notification
      className="mb-2"
      open={openNotification}
      onClose={onClose}
      type={NotificationType.INFO}
      hideIcon
      closable
      style={{ border: 0, padding: "1em", fontSize: "1em", marginTop: 0 }}
    >
      <div>{getText(tilaisuustyyppi)}</div>
    </Notification>
  );
}
export default function Lisatiedot({
  index,
  ensisijainenKaannettavaKieli,
  toissijainenKaannettavaKieli,
  tilaisuustyyppi,
}: Props): ReactElement {
  const {
    register,
    formState: { errors },
    trigger,
    watch,
  } = useFormContext<VuorovaikutustilaisuusFormValues>();

  const [openNotification, setOpenNotification] = useState(true);

  const peruttu = watch(`vuorovaikutusTilaisuudet.${index}.peruttu`);

  return (
    <div>
      {toissijainenKaannettavaKieli && ensisijainenKaannettavaKieli && (
        <LabelJaNappi openNotification={openNotification} setOpenNotification={setOpenNotification} />
      )}
      {toissijainenKaannettavaKieli && ensisijainenKaannettavaKieli && (
        <Infobox openNotification={openNotification} setOpenNotification={setOpenNotification} tilaisuustyyppi={tilaisuustyyppi} />
      )}
      {!(ensisijainenKaannettavaKieli && toissijainenKaannettavaKieli) && (
        <div>
          <LabelJaNappi openNotification={openNotification} setOpenNotification={setOpenNotification} />
          <Infobox openNotification={openNotification} setOpenNotification={setOpenNotification} tilaisuustyyppi={tilaisuustyyppi} />
        </div>
      )}
      {ensisijainenKaannettavaKieli && (
        <TextInput
          label={`Lisätiedot ensisijaisella kielellä (${lowerCase(ensisijainenKaannettavaKieli)})`}
          {...register(`vuorovaikutusTilaisuudet.${index}.lisatiedot.${ensisijainenKaannettavaKieli}`, {
            onChange: () => {
              if (toissijainenKaannettavaKieli) {
                trigger(`vuorovaikutusTilaisuudet.${index}.lisatiedot.${toissijainenKaannettavaKieli}`);
              }
            },
          })}
          error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.lisatiedot?.[ensisijainenKaannettavaKieli]}
          maxLength={200}
          disabled={!!peruttu}
        />
      )}

      {toissijainenKaannettavaKieli && ensisijainenKaannettavaKieli && (
        <TextInput
          label={`Lisätiedot toissijaisella kielellä (${lowerCase(toissijainenKaannettavaKieli)})`}
          {...register(`vuorovaikutusTilaisuudet.${index}.lisatiedot.${toissijainenKaannettavaKieli}`, {
            onChange: () => {
              trigger(`vuorovaikutusTilaisuudet.${index}.lisatiedot.${ensisijainenKaannettavaKieli}`);
            },
          })}
          error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.lisatiedot?.[toissijainenKaannettavaKieli]}
          maxLength={200}
          disabled={!!peruttu}
        />
      )}
    </div>
  );
}
