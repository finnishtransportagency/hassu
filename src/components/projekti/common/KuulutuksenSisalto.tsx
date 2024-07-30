import FormatDate from "../../FormatDate";
import { H2 } from "../../Headings";
import Section from "../../layout/Section2";
import { ReactNode } from "react";

interface Props {
    alkupvm: string,
    loppupvm: string,
    children: ReactNode,
}

const KuulutuksenSisalto = ({alkupvm, loppupvm, children}: Props) => {
  return (
    <>
      <H2>Kuulutuksen sisältö</H2>
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Kuulutuspäivä</p>
          <p className="vayla-label md:col-span-3">Kuulutusvaihe päättyy</p>
          <p className="md:col-span-1 mb-0">{alkupvm}</p>
          <p className="md:col-span-1 mb-0">
            <FormatDate date={loppupvm} />
          </p>
        </div>
        {children}
      </Section>
    </>
  );
};

export default KuulutuksenSisalto;
