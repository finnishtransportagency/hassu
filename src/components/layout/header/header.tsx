import React, {
  ComponentProps,
  Dispatch,
  FunctionComponent,
  ReactElement,
  RefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/router";
import VirkamiesHeaderTopRightContent from "./VirkamiesHeaderTopRightContent";
import { Backdrop, Container, styled, useMediaQuery, useTheme } from "@mui/material";
import HeaderNavigationItem, { NavigationRoute, NavigationRouteCollection } from "../navigation/HeaderNavigationItem";
import Link from "next/link";
import useTranslation from "next-translate/useTranslation";
import KansalaisHeaderTopRightContent from "./KansalaisHeaderTopRightContent";
import classNames from "classnames";
import { useDisableBodyScroll } from "src/hooks/useDisableBodyScrolling";
import throttle from "lodash/throttle";
import useIsResizing from "src/hooks/useIsResizing";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import StyledLink from "@components/StyledLink";
import AnnaPalvelustaPalautettaDialog from "@components/kansalainen/tietoaPalvelusta/AnnaPalvelustaPalautettaDialog";
import { Box } from "@mui/system";
import useKansalaiskieli from "../../../hooks/useKansalaiskieli";
import { Kieli } from "../../../../common/graphql/apiModel";

const virkamiesNavigationRoutes: (NavigationRoute | NavigationRouteCollection)[] = [
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

const kansalainenNavigationRoutes: (NavigationRoute | NavigationRouteCollection)[] = [
  {
    label: "etusivu",
    href: "/",
    icon: "home",
    requireExactMatch: true,
  },
  {
    label: "tietoa-palvelusta",
    href: "/tietoa-palvelusta",
    collection: [
      {
        label: "tietoa-palvelusta",
        href: "/tietoa-palvelusta",
        requireExactMatch: true,
      },
      {
        label: "tietoa-suunnittelusta",
        href: "/tietoa-palvelusta/tietoa-suunnittelusta",
        requireExactMatch: true,
      },
      {
        label: "yhteystiedot-ja-palaute",
        href: "/tietoa-palvelusta/yhteystiedot-ja-palaute",
        requireExactMatch: true,
      },
      {
        label: "saavutettavuus",
        href: "/tietoa-palvelusta/saavutettavuus",
        requireExactMatch: true,
      },
      {
        label: "diehtu-planemis",
        href: "/tietoa-palvelusta/diehtu-planemis",
        requireExactMatch: true,
        excludeInLanguage: Kieli.RUOTSI,
      },
    ],
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

  const logoutHref = process.env.NEXT_PUBLIC_VAYLA_EXTRANET_URL;

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
  const kieli = useKansalaiskieli();
  const kansalainenNavigationRoutesWithTranslation: (NavigationRoute | NavigationRouteCollection)[] = useMemo(
    () =>
      kansalainenNavigationRoutes.map((route) => {
        const { label, collection, ...rest } = route as NavigationRouteCollection;
        if (collection) {
          return {
            label: t(`linkki-tekstit.${label}`),
            collection: collection
              .filter((navigationRoute) => !navigationRoute.excludeInLanguage || navigationRoute.excludeInLanguage !== kieli)
              .map(({ label, ...rest }) => ({ label: t(`linkki-tekstit.${label}`), ...rest })),
            ...rest,
          };
        }
        return { label: t(`linkki-tekstit.${label}`), ...rest };
      }),
    [kieli, t]
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
        {!isYllapito && (
          <div className="skip-to-main-content">
            <a
              href="#mainPageContent"
              onClick={(e) => {
                e.currentTarget.blur();
                document.getElementById("mainPageContent")?.setAttribute("tabIndex", "-1");
                document.getElementById("mainPageContent")?.focus({ preventScroll: false });
                e.preventDefault();
              }}
            >
              {t("hyppaa-sisaltoon")}
            </a>
          </div>
        )}
        <div ref={headerRef}>
          <Container>
            <Box
              sx={{
                display: "flex",
                paddingTop: 5,
                paddingBottom: 6,
                alignItems: "flex-start",
                justifyContent: "space-between",
                rowGap: 5,
                columnGap: 5,
                borderBottomWidth: "1px",
                borderBottomStyle: "solid",
                borderColor: "rgba(0, 0, 0, 0.1)",
              }}
            >
              <SivustoLogo href={isYllapito ? "/yllapito" : "/"} />
              {isMobile ? (
                <HamburgerButton isHamburgerOpen={isHamburgerOpen} onClick={toggleHamburger} />
              ) : isYllapito ? (
                <VirkamiesHeaderTopRightContent />
              ) : (
                <KansalaisHeaderTopRightContent />
              )}
            </Box>
          </Container>
          {isMobile && (
            <Container
              className="absolute left-0 right-0 top-50 bg-white w-full overflow-hidden transition-all duration-300 h-auto"
              sx={{
                maxHeight: isHamburgerOpen ? hamburgerMenuRef.current?.clientHeight : 0,
              }}
            >
              <Box sx={{ paddingBottom: 5 }} ref={hamburgerMenuRef}>
                <Box>{isYllapito ? <VirkamiesHeaderTopRightContent mobile /> : <KansalaisHeaderTopRightContent />}</Box>
                <Box sx={{ borderTopWidth: "1px", borderTopStyle: "solid", borderColor: "rgba(0, 0, 0, 0.1)" }}>
                  <Navigation navigationRoutes={navigationRoutes} mobile />
                </Box>
                {!isYllapito ? (
                  <Box
                    sx={{
                      paddingBottom: 5,
                      paddingTop: 5,
                      borderTopWidth: "1px",
                      borderTopStyle: "solid",
                      borderColor: "rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <AnnaPalvelustaPalautettaContent />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      marginTop: 11,
                    }}
                  >
                    <StyledLink sx={{ fontWeight: 400 }} href={logoutHref} useNextLink={false}>
                      Poistu Palvelusta
                    </StyledLink>
                  </Box>
                )}
              </Box>
            </Container>
          )}
        </div>
        {!isMobile && (
          <Container>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <Navigation navigationRoutes={navigationRoutes} />
              {!isYllapito && (
                <Box sx={{ display: "flex", alignItems: "center", background: "transparent" }}>
                  <AnnaPalvelustaPalautettaContent />
                </Box>
              )}
            </Box>
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

const AnnaPalvelustaPalautettaContent: FunctionComponent = () => {
  const { t } = useTranslation("header");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return (
    <>
      <StyledLink as="button" onClick={openDialog} type="button">
        {t("linkki-tekstit.anna-palvelusta-palautetta")}
      </StyledLink>
      <AnnaPalvelustaPalautettaDialog open={isDialogOpen} onClose={closeDialog} />
    </>
  );
};

const Navigation: FunctionComponent<{ navigationRoutes: (NavigationRoute | NavigationRouteCollection)[]; mobile?: true }> = ({
  navigationRoutes,
  mobile,
}) => {
  const router = useRouter();
  return (
    <nav className="block md:flex">
      <Box
        component="ul"
        sx={{
          display: { xs: "block", md: "flex" },
          paddingBottom: { xs: 4, md: 0 },
          paddingTop: { xs: 1.5, md: 0 },
          float: { md: "left" },
          flexWrap: { md: "wrap" },
          "& > * + *": {
            marginLeft: { md: 16 },
          },
        }}
      >
        {navigationRoutes.map((route, index) => {
          const isCurrentRoute = route.requireExactMatch ? route.href === router.pathname : router.pathname.startsWith(route.href);
          return <HeaderNavigationItem key={index} {...route} isCurrentRoute={isCurrentRoute} mobile={mobile} />;
        })}
      </Box>
    </nav>
  );
};

const SivustoLogo = styled(({ className, href }: { className?: string; href: string }) => {
  const { t } = useTranslation();
  return (
    <Link href={href} className={classNames(className, "flex flex-col uppercase hassu-header-text hover:cursor-pointer")}>
      <span className="font-bold">{t("commonFI:sivustonimi")}</span>
      <span>{t("commonSV:sivustonimi")}</span>
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
    <div>
      <button className="text-primary-dark h-9 w-11 focus:outline focus:outline-2 focus:outline-primary-dark" onClick={onClick}>
        <FontAwesomeIcon size="lg" className="" icon={isHamburgerOpen ? "times" : "bars"} />
      </button>
    </div>
  );
};
