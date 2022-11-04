import React, { ReactElement } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";

interface ProjektiConsumerProps {
  children?: (p: ProjektiLisatiedolla) => ReactElement | null;
}

const ProjektiConsumer = ({ children }: ProjektiConsumerProps) => {
  const { data: projekti } = useProjekti();
  if (!projekti || !children) {
    return <></>;
  }
  return <>{children(projekti)}</>;
};

export default ProjektiConsumer;
