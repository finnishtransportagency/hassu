import React, { ReactElement, ReactNode } from "react";

interface Props {
  title: string;
  children?: ReactNode;
}

export default function InfoBox({ children }: Props): ReactElement {
  return (
    <div className="bg-gray-lightest">
      <h5 className="bg-primary-dark text-white p-4">Suunnitteluhankkeen hallinnollinen vastuu</h5>
      <div className="p-4">{children}</div>
    </div>
  );
}
