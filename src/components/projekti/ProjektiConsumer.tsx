import React, { ReactElement } from "react";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { useProjekti, useProjektiOptions } from "src/hooks/useProjekti";

interface ProjektiConsumerProps {
  children?: (p: ProjektiLisatiedolla) => ReactElement | null;
  useProjektiOptions?: useProjektiOptions;
}

const ProjektiConsumer = ({ children, useProjektiOptions }: ProjektiConsumerProps) => {
  const { data: projekti } = useProjekti(useProjektiOptions);
  if (!projekti || !children) {
    return <></>;
  }
  return <>{children(projekti)}</>;
};

export default ProjektiConsumer;
