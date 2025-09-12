import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import {
  DialogProps,
  DialogActions,
  DialogContent,
  Divider,
  Stack,
  Box,
  TextField,
  Switch,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  FormGroup,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import { Tiedote } from "common/graphql/apiModel";
import dayjs from "dayjs";
import TiedoteDatePicker from "./TiedoteDatePicker";
import { nyt } from "backend/src/util/dateUtil";
import { getDynaaminenStatus, TiedotteenStatus } from "./TiedoteLista";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onDelete?: (tiedote: Tiedote) => void;
  editTiedote?: Tiedote | null;
  tiedotteet: Tiedote[];
} & Required<Pick<DialogProps, "onClose" | "open">>;

export default function TiedoteDialog({ open, onClose, onSubmit, onDelete, editTiedote, tiedotteet }: Props) {
  const isEditing = editTiedote !== null;
  const [errors, setErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    aktiivinen: false,
    otsikko: "",
    kenelleNaytetaan: [] as string[],
    tiedoteFI: "",
    tiedoteSV: "",
    tiedoteTyyppi: "",
    voimassaAlkaen: "",
    voimassaPaattyen: "",
    status: getDynaaminenStatus,
    muokattu: "",
  });

  const maxSisalto = 300;
  const scrollElement = useRef<HTMLDivElement>(null);

  const handleFormSubmit = () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    if (paallekkaisetTiedotteet?.onPaallekkainen) {
      return;
    }
    const tiedoteData = {
      id: editTiedote?.id,
      ...formData,
    };
    onSubmit(tiedoteData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleCheckboxChange = (field: string, value: string, checked: boolean) => {
    setFormData((prev) => {
      const currentArray = (prev[field as keyof typeof prev] as string[]) || [];
      if (checked) {
        return {
          ...prev,
          [field]: currentArray.includes(value) ? currentArray : [...currentArray, value],
        };
      } else {
        return {
          ...prev,
          [field]: currentArray.filter((item) => item !== value),
        };
      }
    });
  };

  const handleDeleteClick = () => {
    if (editTiedote && onDelete) {
      onDelete(editTiedote);
    }
  };

  useEffect(() => {
    if (editTiedote) {
      const today = nyt();
      setFormData({
        aktiivinen: editTiedote.aktiivinen || false,
        otsikko: editTiedote.otsikko || "",
        kenelleNaytetaan: editTiedote.kenelleNaytetaan || [],
        tiedoteFI: editTiedote.tiedoteFI || "",
        tiedoteSV: editTiedote.tiedoteSV || "",
        tiedoteTyyppi: editTiedote.tiedoteTyyppi || "",
        voimassaAlkaen: editTiedote.voimassaAlkaen
          ? dayjs(editTiedote.voimassaAlkaen).tz("Europe/Helsinki").format("YYYY-MM-DDTHH:mm")
          : today.format("YYYY-MM-DD") + "T00:00",
        voimassaPaattyen: editTiedote.voimassaPaattyen
          ? dayjs(editTiedote.voimassaPaattyen).tz("Europe/Helsinki").format("YYYY-MM-DDTHH:mm")
          : "",
        muokattu: editTiedote.muokattu || "",
        status: getDynaaminenStatus,
      });
    } else {
      const today = nyt();
      setFormData({
        aktiivinen: false,
        otsikko: "",
        kenelleNaytetaan: [],
        tiedoteFI: "",
        tiedoteSV: "",
        tiedoteTyyppi: "info",
        voimassaAlkaen: today.format("YYYY-MM-DD") + "T00:00",
        voimassaPaattyen: "",
        muokattu: "",
        status: getDynaaminenStatus,
      });
    }
  }, [editTiedote]);

  useEffect(() => {
    if (formData.aktiivinen && !formData.voimassaPaattyen) {
      const paattymispaiva = formData.voimassaAlkaen ? dayjs(formData.voimassaAlkaen).endOf("day").format("YYYY-MM-DDTHH:mm:ss") : "";

      setFormData((prev) => ({
        ...prev,
        voimassaPaattyen: paattymispaiva,
      }));
    }
  }, [formData.aktiivinen, formData.voimassaAlkaen, formData.voimassaPaattyen]);

  const [paallekkaisetTiedotteet, setPaallekkaisetTiedotteet] = useState<{
    onPaallekkainen: boolean;
    viesti: string;
  } | null>(null);

  const onkoPaallekkainenAjanjakso = (
    alku1: dayjs.Dayjs,
    loppu1: dayjs.Dayjs | null,
    alku2: dayjs.Dayjs,
    loppu2: dayjs.Dayjs | null
  ): boolean => {
    const loppu1Effective = loppu1 || dayjs("2099-01-01");
    const loppu2Effective = loppu2 || dayjs("2099-01-01");

    const overlap1 = alku1.isSame(loppu2Effective, "day") || alku1.isBefore(loppu2Effective, "day");
    const overlap2 = alku2.isSame(loppu1Effective, "day") || alku2.isBefore(loppu1Effective, "day");

    return overlap1 && overlap2;
  };

  useEffect(() => {
    if (!formData.aktiivinen) {
      setPaallekkaisetTiedotteet(null);
      return;
    }
    const alkaaDate = dayjs(formData.voimassaAlkaen).tz("Europe/Helsinki");
    const paattyyDate = formData.voimassaPaattyen ? dayjs(formData.voimassaPaattyen).tz("Europe/Helsinki") : null;

    const paallekkainenTiedote = tiedotteet?.find((t) => {
      if (t.id === editTiedote?.id) return false;

      if (getDynaaminenStatus(t) === TiedotteenStatus.NAKYVILLA || getDynaaminenStatus(t) === TiedotteenStatus.AJASTETTU) {
        const toinenAlkaa = dayjs(t.voimassaAlkaen).tz("Europe/Helsinki");
        const toinenPaattyy = t.voimassaPaattyen ? dayjs(t.voimassaPaattyen).tz("Europe/Helsinki") : null;

        return onkoPaallekkainenAjanjakso(alkaaDate, paattyyDate, toinenAlkaa, toinenPaattyy);
      }
      return false;
    });

    if (paallekkainenTiedote) {
      let viesti = "";
      const toinenAlkaa = dayjs(paallekkainenTiedote.voimassaAlkaen).tz("Europe/Helsinki").format("DD.MM.YYYY");
      const toinenPaattyy = paallekkainenTiedote.voimassaPaattyen
        ? ` - ${dayjs(paallekkainenTiedote.voimassaPaattyen).tz("Europe/Helsinki").format("DD.MM.YYYY")}`
        : " alkaen";

      if (getDynaaminenStatus(paallekkainenTiedote) === TiedotteenStatus.NAKYVILLA) {
        viesti = `Tiedote "${paallekkainenTiedote.otsikko}" on jo näkyvillä (${toinenAlkaa}${toinenPaattyy}). Muuta päivämääriä tai poista aktiivisuus.`;
      } else if (getDynaaminenStatus(paallekkainenTiedote) === TiedotteenStatus.AJASTETTU) {
        viesti = `Tiedote "${paallekkainenTiedote.otsikko}" on jo ajastettu (${toinenAlkaa}${toinenPaattyy}). Muuta päivämääriä tai poista aktiivisuus.`;
      }

      setPaallekkaisetTiedotteet({
        onPaallekkainen: true,
        viesti: viesti,
      });
    } else {
      setPaallekkaisetTiedotteet(null);
    }
  }, [formData.aktiivinen, formData.voimassaAlkaen, formData.voimassaPaattyen, tiedotteet, editTiedote]);

  const validateForm = () => {
    const errors = [];
    if (!formData.otsikko?.trim()) errors.push("Otsikko on pakollinen");
    if (!formData.voimassaAlkaen) errors.push("Voimassaolon alkupäivä on pakollinen");
    if (!formData.tiedoteTyyppi) errors.push("Tiedotteen tyyppi on pakollinen");
    if (formData.kenelleNaytetaan.length === 0) errors.push("Valitse, kenelle tiedote näytetään");
    if (!formData.tiedoteFI?.trim()) errors.push("Sisältö suomeksi on pakollinen");
    if (formData.kenelleNaytetaan.includes("Kansalainen")) {
      if (!formData.tiedoteSV?.trim()) {
        errors.push("Sisältö ruotsiksi on pakollinen, koska tiedote näytetään kansalaisille");
      }
    }
    return errors;
  };

  return (
    <HassuDialog
      PaperProps={{ sx: { maxHeight: "95vh", minHeight: "70vh" } }}
      title={isEditing ? "Muokkaa tiedotetta" : "Uusi tiedote"}
      open={open}
      onClose={onClose}
      scroll="paper"
      maxWidth="lg"
    >
      <DialogContent ref={scrollElement} sx={{ display: "flex", flexDirection: "column", padding: 0, marginBottom: 7 }}>
        <Stack direction={{ xs: "column", lg: "row" }} style={{ flex: "1 1 auto" }} divider={<Divider orientation="vertical" flexItem />}>
          <Box sx={{ flex: 1, padding: 10 }}>
            <Stack direction="row" spacing={2} sx={{ marginBottom: 15 }}>
              <Box sx={{ flex: 1.5 }}>
                <TextField
                  value={formData.otsikko}
                  onChange={(e) => handleChange("otsikko", e.target.value)}
                  error={errors.some((error) => error.includes("Otsikko"))}
                  helperText={errors.find((error) => error.includes("Otsikko"))}
                  fullWidth
                  label="Otsikko (ei näy tiedotteella) *"
                  variant="outlined"
                  size="small"
                />
              </Box>
              <Box sx={{ flex: 0.5 }}>
                <TiedoteDatePicker
                  field="voimassaAlkaen"
                  value={formData.voimassaAlkaen}
                  onChange={handleChange}
                  label="Voimassa alkaen"
                  minDate={dayjs()}
                  required={true}
                  error={errors.some((error) => error.includes("alkupäivä"))}
                  helperText={errors.find((error) => error.includes("alkupäivä"))}
                />
              </Box>

              <Box sx={{ flex: 0.5 }}>
                <TiedoteDatePicker
                  field="voimassaPaattyen"
                  value={formData.voimassaPaattyen}
                  onChange={handleChange}
                  label="Voimassa päättyen"
                  minDate={dayjs()}
                  required={false}
                />
              </Box>

              <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Aktiivisuus</InputLabel>
                  <FormControlLabel
                    control={<Switch checked={formData.aktiivinen} onChange={(e) => handleChange("aktiivinen", e.target.checked)} />}
                    label={formData.aktiivinen ? "Aktiivinen" : "Ei aktiivinen"}
                  />
                  {paallekkaisetTiedotteet?.onPaallekkainen && (
                    <Typography variant="body2" color="error" sx={{ mt: 1, mb: 2 }}>
                      {paallekkaisetTiedotteet.viesti}
                    </Typography>
                  )}
                </FormControl>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ marginBottom: 15 }}>
              <Box sx={{ flex: 1.3 }}>
                <Typography sx={{ marginBottom: 1 }}>Näkyvyys</Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.kenelleNaytetaan.includes("Virkamies")}
                        onChange={(e) => handleCheckboxChange("kenelleNaytetaan", "Virkamies", e.target.checked)}
                      />
                    }
                    label="Virkamies"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.kenelleNaytetaan.includes("Kansalainen")}
                        onChange={(e) => handleCheckboxChange("kenelleNaytetaan", "Kansalainen", e.target.checked)}
                      />
                    }
                    label="Kansalainen"
                  />
                </FormGroup>
                {errors.some((error) => error.includes("kenelle")) && (
                  <Typography variant="body2" color="error" sx={{ mt: 1, fontSize: "0.75rem" }}>
                    {errors.find((error) => error.includes("kenelle"))}
                  </Typography>
                )}
              </Box>

              <Box sx={{ flex: 1 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tiedotteen tyyppi *</InputLabel>
                  <Select
                    label="tyyppi"
                    value={formData.tiedoteTyyppi}
                    onChange={(e) => handleChange("tiedoteTyyppi", e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="">Valitse</MenuItem>
                    <MenuItem value="info">Info</MenuItem>
                    <MenuItem value="varoitus">Varoitus</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flex: 0.5 }}></Box>
              <Box sx={{ flex: 1 }}></Box>
            </Stack>

            <Stack sx={{ marginBottom: 3 }}>
              <TextField
                fullWidth
                label="Tiedote suomeksi *"
                variant="outlined"
                size="small"
                multiline
                rows={3}
                value={formData.tiedoteFI}
                onChange={(e) => handleChange("tiedoteFI", e.target.value)}
                error={errors.some((error) => error.includes("suomeksi"))}
                helperText={errors.find((error) => error.includes("suomeksi"))}
                inputProps={{ maxLength: maxSisalto }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: -2, display: "block", textAlign: "right" }}>
                {formData.tiedoteFI.length}/{maxSisalto}
              </Typography>
            </Stack>

            <Stack sx={{ marginBottom: 3 }}>
              <TextField
                fullWidth
                label={formData.kenelleNaytetaan.includes("Kansalainen") ? "Tiedote ruotsiksi *" : "Tiedote ruotsiksi"}
                variant="outlined"
                size="small"
                multiline
                rows={3}
                value={formData.tiedoteSV}
                onChange={(e) => handleChange("tiedoteSV", e.target.value)}
                error={errors.some((error) => error.includes("ruotsiksi"))}
                helperText={errors.find((error) => error.includes("ruotsiksi"))}
                inputProps={{ maxLength: maxSisalto }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: -2, display: "block", textAlign: "right" }}>
                {formData.tiedoteSV.length}/{maxSisalto}
              </Typography>
            </Stack>

            <Box sx={{ marginTop: 4, marginBottom: 3 }}>
              <Typography sx={{ marginBottom: 3 }}>Esikatselu</Typography>

              <Notification
                sx={{ marginBottom: 5, whiteSpace: "pre-wrap" }}
                type={formData.tiedoteTyyppi === "info" ? NotificationType.INFO_GRAY : NotificationType.WARN}
              >
                {formData.tiedoteFI || "Sisältö suomeksi"}
              </Notification>

              <Notification
                sx={{ marginBottom: 5, whiteSpace: "pre-wrap" }}
                type={formData.tiedoteTyyppi === "info" ? NotificationType.INFO_GRAY : NotificationType.WARN}
              >
                {formData.tiedoteSV || "Innehåll på svenska"}
              </Notification>
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions style={{ paddingLeft: "40px", paddingRight: "40px", paddingBottom: "20px" }}>
        {editTiedote && (
          <Button type="button" onClick={handleDeleteClick} style={{ marginRight: "auto" }}>
            Poista tiedote
          </Button>
        )}
        <Button primary type="button" id="save_tiedote_button" onClick={handleFormSubmit}>
          Tallenna
        </Button>
        <Button type="button" onClick={() => onClose?.({}, "escapeKeyDown")}>
          Peruuta
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}
