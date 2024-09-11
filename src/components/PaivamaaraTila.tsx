import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import dayjs from "dayjs";
import { faClose, faCheck } from "@fortawesome/free-solid-svg-icons";

interface TilaProps {
  pvm?: string | null;
  tila?: string | null;
}

export function PaivamaaraTila(props: Readonly<TilaProps>) {
  return (
    <>
      {props.pvm ? dayjs(props.pvm).format("DD.MM.YYYY HH:mm") : "-"}{" "}
      {props.tila === "OK" && <FontAwesomeIcon icon={faCheck} color="green" />}
      {props.tila === "VIRHE" && <FontAwesomeIcon icon={faClose} color="red" />}
    </>
  );
}
