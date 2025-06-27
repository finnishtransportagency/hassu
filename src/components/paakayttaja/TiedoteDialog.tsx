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

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  editTiedote?: Tiedote | null;
} & Required<Pick<DialogProps, "onClose" | "open">>;

export default function TiedoteDialog({ open, onClose, onSubmit, editTiedote }: Props) {
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
    status: "",
  });
  const maxSisalto = 300;
  const scrollElement = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    const tiedoteData = {
      id: editTiedote?.id,
      ...formData,
    };
    onSubmit(tiedoteData);
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.otsikko?.trim()) errors.push("Otsikko on pakollinen");
    if (!formData.tiedoteFI?.trim()) errors.push("Sisältö suomeksi on pakollinen");
    if (!formData.voimassaAlkaen) errors.push("Voimassaolon alkupäivä on pakollinen");
    if (!formData.tiedoteTyyppi) errors.push("Tiedotteen tyyppi on pakollinen");
    if (formData.kenelleNaytetaan.length === 0) errors.push("Valitse vähintään yksi kohderyhmä");
    return errors;
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

  useEffect(() => {
    if (editTiedote) {
      const today = dayjs();
      setFormData({
        aktiivinen: editTiedote.aktiivinen || false,
        otsikko: editTiedote.otsikko || "",
        kenelleNaytetaan: editTiedote.kenelleNaytetaan || [],
        tiedoteFI: editTiedote.tiedoteFI || "",
        tiedoteSV: editTiedote.tiedoteSV || "",
        tiedoteTyyppi: editTiedote.tiedoteTyyppi || "",
        voimassaAlkaen: today.format("YYYY-MM-DD") + "T00:00:00",
        voimassaPaattyen: editTiedote.voimassaPaattyen || "",
        status: editTiedote.status || "",
      });
    } else {
      setFormData({
        aktiivinen: false,
        otsikko: "",
        kenelleNaytetaan: [],
        tiedoteFI: "",
        tiedoteSV: "",
        tiedoteTyyppi: "",
        voimassaAlkaen: "",
        voimassaPaattyen: "",
        status: "",
      });
    }
  }, [editTiedote]);

  return (
    <HassuDialog
      PaperProps={{ sx: { maxHeight: "95vh", minHeight: "70vh" } }}
      title={isEditing ? "Muokkaa tiedotetta" : "Uusi tiedote"}
      open={open}
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
              {/* 
              <Box sx={{ flex: 0.5 }}>
                <HassuDatePickerWithController
                  field="voimassaAlkaen"
                  value={formData.voimassaAlkaen ? dayjs(formData.voimassaAlkaen).format("YYYY-MM-DD") : ""}
                  onChange={handleDateChange}
                  label="Voimassa alkaen"
                  minDate={today()}
                  textFieldProps={{ required: true }}
                  controllerProps={{ control, name: "tiedote.aloituspaiva" }}
                />
              </Box>

              <Box sx={{ flex: 0.5 }}>
                <HassuDatePickerWithController
                  label="Päättyen"
                  value={formData.voimassaPaattyen ? dayjs(formData.voimassaPaattyen) : null}
                  onChange={handleDateChange("voimassaPaattyen")}
                  minDate={today()}
                  textFieldProps={{ required: true }}
                  controllerProps={{ control, name: "tiedote.lopetuspaiva" }}
                />
              </Box> */}

              <Box sx={{ flex: 0.5 }}>
                <TiedoteDatePicker
                  field="voimassaAlkaen"
                  value={formData.voimassaAlkaen}
                  onChange={handleChange}
                  label="Voimassa alkaen"
                  minDate={dayjs()}
                  required={true}
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
                label="Tiedote järjestelmän ensisijaisella kielellä (suomi) *"
                variant="outlined"
                size="small"
                multiline
                rows={3}
                value={formData.tiedoteFI}
                onChange={(e) => handleChange("tiedoteFI", e.target.value)}
                error={errors.some((error) => error.includes("Sisältö"))}
                helperText={errors.find((error) => error.includes("Sisältö"))}
                inputProps={{ maxLength: maxSisalto }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: -2, display: "block", textAlign: "right" }}>
                {formData.tiedoteFI.length}/{maxSisalto}
              </Typography>
            </Stack>

            <Stack sx={{ marginBottom: 3 }}>
              <TextField
                fullWidth
                label="Tiedote järjestelmän toissijaisella kielellä (ruotsi) (vain kansalaiselle) *"
                variant="outlined"
                size="small"
                multiline
                rows={3}
                value={formData.tiedoteSV}
                onChange={(e) => handleChange("tiedoteSV", e.target.value)}
                inputProps={{ maxLength: maxSisalto }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: -2, display: "block", textAlign: "right" }}>
                {formData.tiedoteSV.length}/{maxSisalto}
              </Typography>
            </Stack>

            <Box sx={{ marginTop: 4, marginBottom: 3 }}>
              <Typography sx={{ marginBottom: 3 }}>Esikatselu</Typography>

              <Notification sx={{ marginBottom: 5 }} type={NotificationType.WARN}>
                {formData.tiedoteFI || "Sisältö suomeksi"}
              </Notification>

              <Notification sx={{ marginBottom: 5 }} type={NotificationType.WARN}>
                {formData.tiedoteSV || "Innehåll på svenska"}
              </Notification>
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        {/* {isEditing && (
          <Button variant="outlined" color="error" onClick={handleDelete}>
            Poista tiedote
          </Button>
        )} */}
        <Button type="button" onClick={() => onClose?.({}, "escapeKeyDown")}>
          Peruuta
        </Button>
        <Button primary type="button" id="save_tiedote_button" onClick={handleSubmit}>
          Tallenna
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}
