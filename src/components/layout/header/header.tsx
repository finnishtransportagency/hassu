import React, {
  ComponentProps,
  Dispatch,
  FunctionComponent,
  ReactElement,
  RefObject,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/router";
import VirkamiesHeaderTopRightContent from "./VirkamiesHeaderTopRightContent";
import { Backdrop, Container, styled, useMediaQuery, useTheme } from "@mui/material";
import HeaderNavigationItem, { NavigationRoute } from "../navigation/HeaderNavigationItem";
import Link from "next/link";
import useTranslation from "next-translate/useTranslation";
import KansalaisHeaderTopRightContent from "./KansalaisHeaderTopRightContent";
import classNames from "classnames";
import { useDisableBodyScroll } from "src/hooks/useDisableBodyScrolling";
import { throttle } from "lodash";
import useIsResizing from "src/hooks/useIsResizing";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const virkamiesNavigationRoutes: NavigationRoute[] = [
  {
    label: "Etusivu",
    href: "/yllapito",
    icon: "home",
    requireExactMatch: true,
  },
  { label: "Projektin perustaminen", href: "/yllapito/perusta" },
  {
    label: "Ohjeet",
    href: "/yllapito/ohjeet",
  },
];

const kansalainenNavigationRoutes: NavigationRoute[] = [
  {
    label: "etusivu",
    href: "/",
    icon: "home",
    requireExactMatch: true,
  },
  {
    label: "tietoa-palvelusta",
    href: "/tietoa-palvelusta",
  },
];

interface HandleScrollProps {
  headerRef: RefObject<HTMLDivElement>;
  headerHeight: number;
  setHeaderTop: Dispatch<SetStateAction<number>>;
  setPosition: Dispatch<SetStateAction<number>>;
  position: number;
  lastPositionMovingDown: number;
  lastPositionMovingUp: number;
  setLastPositionMovingDown: Dispatch<SetStateAction<number>>;
  setLastPositionMovingUp: Dispatch<SetStateAction<number>>;
  setHideHeader: Dispatch<SetStateAction<boolean>>;
  isResizing: boolean;
}

function handleScroll({
  headerRef,
  headerHeight,
  setHeaderTop,
  setPosition,
  position,
  lastPositionMovingDown,
  lastPositionMovingUp,
  setLastPositionMovingDown,
  setLastPositionMovingUp,
  setHideHeader,
  isResizing,
}: HandleScrollProps) {
  const headerElementHeight = headerRef.current?.clientHeight;

  if (typeof headerElementHeight === "number" && headerHeight !== headerElementHeight) {
    setHeaderTop(headerElementHeight);
  }

  if (isResizing) {
    return;
  }

  let nextPosition = window.scrollY;

  setPosition(nextPosition);

  const isMovingDown = position < nextPosition;
  if (isMovingDown) {
    const movedPastOffset = Math.abs(nextPosition - lastPositionMovingUp) > SCROLL_OFFSET;
    if (movedPastOffset) {
      setHideHeader(true);
    }
    setLastPositionMovingDown(nextPosition);
  } else {
    const movedPastOffset = Math.abs(lastPositionMovingDown - nextPosition) > SCROLL_OFFSET;
    if (movedPastOffset) {
      setHideHeader(false);
    }
    setLastPositionMovingUp(nextPosition);
  }
}

const SCROLL_OFFSET = 200;

export default function Header(): ReactElement {
  const router = useRouter();
  const [headerHeight, setHeaderTop] = useState<number>(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const hamburgerMenuRef = useRef<HTMLDivElement>(null);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [hideHeader, setHideHeader] = useState(false);
  const [position, setPosition] = useState(0);
  const [lastPositionMovingDown, setLastPositionMovingDown] = useState(0);
  const [lastPositionMovingUp, setLastPositionMovingUp] = useState(0);

  const throlledHandleScroll = useRef(throttle((p: HandleScrollProps) => handleScroll(p), 100)).current;

  const isResizing = useIsResizing();

  useEffect(() => {
    const handleScrollProps: HandleScrollProps = {
      headerRef,
      headerHeight,
      setHeaderTop,
      setPosition,
      position,
      lastPositionMovingDown,
      lastPositionMovingUp,
      setLastPositionMovingDown,
      setLastPositionMovingUp,
      setHideHeader,
      isResizing,
    };
    const onScrollHandler = () => throlledHandleScroll(handleScrollProps);
    window.addEventListener("scroll", onScrollHandler);
    return () => {
      window.removeEventListener("scroll", onScrollHandler);
    };
  }, [throlledHandleScroll, headerHeight, isResizing, lastPositionMovingDown, lastPositionMovingUp, position]);

  useDisableBodyScroll(isHamburgerOpen);

  const { t } = useTranslation("header");

  const kansalainenNavigationRoutesWithTranslation: NavigationRoute[] = useMemo(
    () => kansalainenNavigationRoutes.map(({ label, ...route }) => ({ label: t(`linkki-tekstit.${label}`), ...route })),
    [t]
  );

  const isYllapito = router.asPath.startsWith("/yllapito");
  const navigationRoutes = isYllapito ? virkamiesNavigationRoutes : kansalainenNavigationRoutesWithTranslation;

  const toggleHamburger = () => {
    setIsHamburgerOpen(!isHamburgerOpen);
  };

  const closeHamburger = () => {
    setIsHamburgerOpen(false);
  };

  useEffect(() => {
    if (!isMobile) {
      closeHamburger();
    }
  }, [isMobile]);

  useEffect(() => {
    router.events.on("routeChangeStart", closeHamburger);
    return () => router.events.off("routeChangeStart", closeHamburger);
  }, [router.events]);

  return (
    <>
      <header
        className="sticky bg-white w-full transition-all duration-300"
        style={{ top: `${hideHeader ? -headerHeight : 0}px`, zIndex: theme.zIndex.appBar }}
      >
        <div ref={headerRef}>
          <Container>
            <div className="flex pt-5 pb-6 border-b border-gray-light items-start justify-between gap-x-5 gap-y-5">
              <SivustoLogo href={isYllapito ? "/yllapito" : "/"} />
              {isMobile ? (
                <HamburgerButton isHamburgerOpen={isHamburgerOpen} onClick={toggleHamburger} />
              ) : isYllapito ? (
                <VirkamiesHeaderTopRightContent />
              ) : (
                <KansalaisHeaderTopRightContent />
              )}
            </div>
          </Container>
          {isMobile && (
            <Container
              className="absolute left-0 right-0 top-50 bg-white w-full overflow-hidden transition-all duration-300"
              sx={{
                maxHeight: isHamburgerOpen ? hamburgerMenuRef.current?.clientHeight : 0,
              }}
            >
              <div ref={hamburgerMenuRef}>
                {isYllapito ? <VirkamiesHeaderTopRightContent mobile /> : <KansalaisHeaderTopRightContent />}
                <Navigation navigationRoutes={navigationRoutes} mobile />
              </div>
            </Container>
          )}
        </div>
        {!isMobile && (
          <Container>
            <Navigation navigationRoutes={navigationRoutes} />
            <div className="pb-2" style={{ background: "linear-gradient(117deg, #009ae0, #49c2f1)" }} />
          </Container>
        )}
      </header>
      {isMobile && (
        <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.appBar - 1 }} open={isHamburgerOpen} onClick={closeHamburger} />
      )}
    </>
  );
}

const Navigation: FunctionComponent<{ navigationRoutes: NavigationRoute[]; mobile?: true }> = ({ navigationRoutes, mobile }) => {
  const router = useRouter();
  return (
    <nav className="block md:flex border-t border-gray-light uppercase">
      <ul className="block pb-8 md:pb-0 md:flex md:float-left md:flex-wrap md:space-x-16">
        {navigationRoutes.map((route, index) => {
          const isCurrentRoute = route.requireExactMatch ? route.href === router.pathname : router.pathname.startsWith(route.href);
          return <HeaderNavigationItem key={index} {...route} isCurrentRoute={isCurrentRoute} mobile={mobile} />;
        })}
      </ul>
    </nav>
  );
};

const SivustoLogo = styled(({ className, href }: { className?: string; href: string }) => {
  const { t } = useTranslation();
  return (
    <Link href={href}>
      <a className={classNames(className, "flex flex-col uppercase hassu-header-text hover:cursor-pointer")}>
        <span className="font-bold">{t("commonFI:sivustonimi")}</span>
        <span>{t("commonSV:sivustonimi")}</span>
      </a>
    </Link>
  );
})(({ theme }) => ({
  [theme.breakpoints.down("md")]: {
    "&&": {
      fontSize: "0.875rem",
    },
  },
}));

const HamburgerButton: FunctionComponent<{ isHamburgerOpen: boolean; onClick: ComponentProps<"button">["onClick"] }> = ({
  isHamburgerOpen,
  onClick,
}) => {
  return (
    <>
      <div>
        <button className="text-primary-dark h-9 w-11 focus:outline focus:outline-2 focus:outline-primary-dark" onClick={onClick}>
          <FontAwesomeIcon size="lg" className="" icon={isHamburgerOpen ? "times" : "bars"} />
        </button>
      </div>
    </>
  );
};
