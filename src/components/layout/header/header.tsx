import React, { ReactElement } from "react";
import { useRouter } from "next/router";
import { VirkamiesHeader } from "./virkamiesHeader";
import KansalaisHeader from "./kansalaisHeader";

export interface HeaderProps {
  scrolledPastOffset: boolean;
}

export default function Header({ scrolledPastOffset: scrollOffset }: HeaderProps): ReactElement {
  const router = useRouter();
  const isYllapito = router.asPath.startsWith("/yllapito");

  return isYllapito ? (
    <VirkamiesHeader scrolledPastOffset={scrollOffset} />
  ) : (
    <KansalaisHeader scrolledPastOffset={scrollOffset} />
  );
}
