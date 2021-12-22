import { useRouter } from "next/router";
import React, { ReactElement, ReactNode } from "react";
import useProjekti from "src/hooks/useProjekti";
import ProjektiSideNavigation from "./ProjektiSideNavigation";

interface Props {
  children: ReactNode;
  title: string;
}

export default function ProjektiPageLayout({ children, title }: Props): ReactElement {
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti } = useProjekti(oid);

  return (
    <section>
      <h1>{title}</h1>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-3">
        <div className="md:col-span-6 lg:col-span-4 xl:col-span-3">
          <ProjektiSideNavigation />
        </div>
        <div className="md:col-span-6 lg:col-span-8 xl:col-span-9">
          <h2>{projekti?.velho?.nimi || "-"}</h2>
          {children}
        </div>
      </div>
    </section>
  );
}
