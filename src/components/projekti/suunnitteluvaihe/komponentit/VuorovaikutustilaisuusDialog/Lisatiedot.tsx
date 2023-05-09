import React, { ReactElement, useState } from "react";
import TextInput from "@components/form/TextInput";
import { useFormContext } from "react-hook-form";
import { lowerCase } from "lodash";
import { KaannettavaKieli } from "common/kaannettavatKielet";
import { VuorovaikutustilaisuusFormValues } from ".";
import { Label } from "@components/form/FormGroup";
import Notification, { NotificationType } from "../../../../notification/ControllableNotification";
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
        "Lisätiedot-kenttään voit kirjoittaa tietoja mm. kahvitustilaisuudesta" +
        " tai saapumisohjeista. Lisätiedot näkyvät palvelun" +
        " julkisella puolella sekä kutsulla. Kutsun jälkeen tehdyt muutokset" +
        " tulevat näkyviin vain palvelun julkiselle puolelle."
      );
    case VuorovaikutusTilaisuusTyyppi.SOITTOAIKA:
      return (
        "Lisätiedot-kenttään voit kirjoittaa mm. kehen olla yhteydessä missäkin asiassa." +
        " Lisätiedot näkyvät palvelun" +
        " julkisella puolella sekä kutsulla. Kutsun jälkeen tehdyt muutokset" +
        " tulevat näkyviin vain palvelun julkiselle puolelle."
      );
    case VuorovaikutusTilaisuusTyyppi.VERKOSSA:
      return (
        "Lisätiedot-kenttään voit kirjoittaa mm. siitä, miten tilaisuus etenee ja" +
        " ketkä ovat mukana tilaisuudessa esittelemässä suunnitelmaa." +
        " Lisätiedot näkyvät palvelun" +
        " julkisella puolella sekä kutsulla. Kutsun jälkeen tehdyt muutokset" +
        " tulevat näkyviin vain palvelun julkiselle puolelle."
      );
    default:
      return "";
  }
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
        <Label style={{ fontSize: "1em " }}>
          <span>Lisätiedot</span>
          <InfoIcon
            onClick={() => setOpenNotification(true)}
            className="ml-2"
            style={{ color: "#0064af", width: "0.75em", paddingBottom: "0.1em", cursor: openNotification ? "default" : "pointer" }}
          />
        </Label>
      )}
      {toissijainenKaannettavaKieli && ensisijainenKaannettavaKieli && (
        <Notification
          open={openNotification}
          setOpen={setOpenNotification}
          type={NotificationType.INFO}
          hideIcon
          closable
          style={{ border: 0, padding: "1em", fontSize: "1em", marginTop: 0 }}
        >
          <div>{getText(tilaisuustyyppi)}</div>
        </Notification>
      )}
      {ensisijainenKaannettavaKieli && (
        <TextInput
          label={`Lisätiedot (${lowerCase(ensisijainenKaannettavaKieli)})`}
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
          label={`Lisätiedot (${lowerCase(toissijainenKaannettavaKieli)})`}
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
