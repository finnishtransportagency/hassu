import Notification, { NotificationType } from "@components/notification/Notification";
import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { api, Tiedote } from "@services/api";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { nyt } from "backend/src/util/dateUtil";

export const TiedoteNotification = () => {
  const [aktiivinenTiedote, setAktiivinenTiedote] = useState<Tiedote | null>(null);
  const [suljetutTiedotteet, setSuljetutTiedotteet] = useState<string[]>([]);
  const [kieli, setKieli] = useState<"fi" | "sv">("fi");

  useEffect(() => {
    const suljetut = localStorage.getItem("suljetutTiedotteet");
    if (suljetut) {
      setSuljetutTiedotteet(JSON.parse(suljetut));
    }
  }, []);

  const suljeTiedote = (tiedoteId: string) => {
    const paivitetytSuljetut = [...suljetutTiedotteet, tiedoteId];
    setSuljetutTiedotteet(paivitetytSuljetut);
    localStorage.setItem("suljetutTiedotteet", JSON.stringify(paivitetytSuljetut));
    setAktiivinenTiedote(null);
  };

  const getKayttajatyyppi = (): "Virkamies" | "Kansalainen" => {
    const path = window.location.pathname;

    if (path.includes("/yllapito")) {
      return "Virkamies";
    }
    return "Kansalainen";
  };

  const getTiedoteTyyppi = (tiedote: Tiedote): string => {
    if (tiedote.tiedoteTyyppi === "info") {
      return "info";
    }
    return "varoitus";
  };

  const getCurrentLanguage = (): "fi" | "sv" => {
    const htmlLang = document.documentElement.lang;
    if (htmlLang === "sv" || htmlLang === "sv-FI") return "sv";
    if (window.location.pathname.startsWith("/sv")) return "sv";
    return "fi";
  };

  useEffect(() => {
    const updateLanguage = () => {
      setKieli(getCurrentLanguage());
    };

    window.addEventListener("popstate", updateLanguage);

    const observer = new MutationObserver(updateLanguage);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });

    updateLanguage();

    return () => {
      window.removeEventListener("popstate", updateLanguage);
      observer.disconnect();
    };
  }, []);

  const getTiedoteSisalto = (tiedote: Tiedote): string => {
    if (kieli === "sv" && tiedote.tiedoteSV) {
      return tiedote.tiedoteSV;
    }
    return tiedote.tiedoteFI;
  };

  const onkoTiedoteNakyvilla = (tiedote: Tiedote): boolean => {
    const kayttajatyyppi = getKayttajatyyppi();
    if (suljetutTiedotteet.includes(tiedote.id)) {
      return false;
    }
    return tiedote.kenelleNaytetaan?.includes(kayttajatyyppi) || false;
  };

  const getDynaaminenStatus = (tiedote: Tiedote): string => {
    if (!tiedote.aktiivinen) {
      return "EI_NAKYVILLA";
    }

    const alkaa = dayjs(tiedote.voimassaAlkaen).tz("Europe/Helsinki");
    const paattyy = tiedote.voimassaPaattyen ? dayjs(tiedote.voimassaPaattyen).tz("Europe/Helsinki") : null;
    const nykyhetki = nyt();

    if (paattyy && nykyhetki.isAfter(paattyy, "day")) {
      return "EI_NAKYVILLA";
    }
    if (nykyhetki.isBefore(alkaa, "day")) {
      return "AJASTETTU";
    }
    return "NAKYVILLA";
  };

  useEffect(() => {
    const haeAktiivinenTiedote = async () => {
      try {
        const tiedotteet = await api.listaaTiedotteet();
        const nakyvillaTiedote = tiedotteet.find((t) => {
          const dynaaminenStatus = getDynaaminenStatus(t);
          return dynaaminenStatus === "NAKYVILLA" && onkoTiedoteNakyvilla(t);
        });
        setAktiivinenTiedote(nakyvillaTiedote || null);
      } catch (error) {
        console.error("Virhe tiedotteen haussa:", error);
      }
    };

    haeAktiivinenTiedote();
    const interval = setInterval(haeAktiivinenTiedote, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [suljetutTiedotteet]);

  if (!aktiivinenTiedote) return null;

  return (
    <Notification
      sx={{
        whiteSpace: "pre-wrap",
        width: "90%",
        margin: "10px auto 10px",
        position: "relative",
        paddingRight: "40px",
      }}
      type={getTiedoteTyyppi(aktiivinenTiedote) === "info" ? NotificationType.INFO_GRAY : NotificationType.WARN}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, paddingRight: "16px" }}>{getTiedoteSisalto(aktiivinenTiedote)}</div>
        <IconButton
          size="small"
          onClick={() => suljeTiedote(aktiivinenTiedote.id)}
          sx={{
            position: "absolute",
            top: "8px",
            right: "8px",
            color: "inherit",
            opacity: 0.7,
            "&:hover": { opacity: 1 },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
    </Notification>
  );
};
