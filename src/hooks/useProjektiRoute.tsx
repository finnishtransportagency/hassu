import { useRouter } from "next/router";
import useProjekti from "./useProjekti";

export function useProjektiRoute() {
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  return useProjekti(oid);
}
