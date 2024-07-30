import { ButtonFlatWithIcon } from "@components/button/ButtonFlat";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { aineistoKategoriat } from "common/aineistoKategoriat";

type Props = {
  expandedAineisto: React.Key[];
  setExpandedAineisto: (value: React.SetStateAction<React.Key[]>) => void;
};
export function AccordionToggleButton({ expandedAineisto, setExpandedAineisto }: Props) {
  return (
    <ButtonFlatWithIcon
      type="button"
      onClick={() => {
        if (!!expandedAineisto.length) {
          setExpandedAineisto([]);
        } else {
          setExpandedAineisto(aineistoKategoriat.listKategoriaIds());
        }
      }}
      iconComponent={
        <span className="fa-layers">
          <FontAwesomeIcon icon="chevron-down" transform="down-6" flip={!!expandedAineisto.length ? "vertical" : undefined} />
          <FontAwesomeIcon icon="chevron-up" transform="up-6" flip={!!expandedAineisto.length ? "vertical" : undefined} />
        </span>
      }
    >
      {!!expandedAineisto.length ? "Sulje" : "Avaa"} kaikki kategoriat
    </ButtonFlatWithIcon>
  );
}
