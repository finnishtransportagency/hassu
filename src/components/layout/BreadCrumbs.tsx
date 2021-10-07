import React, { ReactElement } from "react";
import { breadcrumb } from "@styles/BreadCrumbs.module.css";

export default function BreadCrumbs({}): ReactElement {
  return (
    <div className="container mb-4">
      <nav>
        <ol className={`${breadcrumb}`}>
          <li>Valtion väylien suunnittelu</li>
          <li>Projektin perustaminen</li>
        </ol>
      </nav>
    </div>
  );
}
