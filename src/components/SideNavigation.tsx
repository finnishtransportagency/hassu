// Contains code generated or recommended by Amazon Q
import HassuLink from "@components/HassuLink";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import classNames from "classnames";
import { useRouter } from "next/router";
import React, { useState } from "react";

export interface Route {
  id: string;
  title: string;
  pathname: string;
  requireExactMatch?: boolean;
  disabled?: boolean;
  children?: Omit<Route, "children">[];
}

export default function SideNavigation({ routes }: { routes: Route[] }) {
  const router = useRouter();
  const initiallyExpanded = routes
    .filter((r) => r.children?.some((c) => (c.requireExactMatch ? c.pathname === router.pathname : router.pathname.startsWith(c.pathname))))
    .map((r) => r.id);
  const [expanded, setExpanded] = useState<string[]>(initiallyExpanded);

  const toggle = (id: string) => {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div role="navigation" className="bg-gray-lightest">
      <ul>
        {routes.map((route) => {
          const isSelected = route.requireExactMatch ? route.pathname === router.pathname : router.pathname.startsWith(route.pathname);
          const isExpanded = expanded.includes(route.id);

          return (
            <li key={route.id}>
              <div
                className={classNames(
                  "flex items-center justify-between border-l-4",
                  isSelected ? "border-primary bg-gray-light" : "border-transparent",
                  route.disabled ? "text-gray" : "hover:bg-gray-light"
                )}
              >
                <HassuLink id={"sidenavi_" + route.id} href={{ pathname: route.pathname }} className="flex-1 p-4 hover:underline">
                  {route.title}
                </HassuLink>
                {route.children && (
                  <button
                    onClick={() => toggle(route.id)}
                    aria-expanded={isExpanded}
                    className="w-12 self-stretch flex items-center justify-center text-primary-dark hover:bg-primary-dark hover:text-white"
                  >
                    <ExpandMoreIcon className={classNames("transition-transform", isExpanded ? "rotate-180" : "")} />
                  </button>
                )}
              </div>
              {route.children && isExpanded && (
                <ul>
                  {route.children.map((child) => {
                    const isChildSelected = child.requireExactMatch
                      ? child.pathname === router.pathname
                      : router.pathname.startsWith(child.pathname);
                    return (
                      <li key={child.id}>
                        <HassuLink
                          id={"sidenavi_" + child.id}
                          href={{ pathname: child.pathname }}
                          className={classNames(
                            "block pl-10 pr-4 py-4 border-l-4 hover:underline",
                            isChildSelected ? "border-primary bg-gray-light" : "border-transparent",
                            child.disabled ? "text-gray" : "hover:bg-gray-light"
                          )}
                        >
                          {child.title}
                        </HassuLink>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
