import { useResponsive } from "./useResponsive";

const ROUTES = {
  welcome: "/(auth)/welcome",
  details: "/(auth)/details",
  landing: "/(auth)/landing",
  login: "/(auth)/login",
} as const;

type AuthRoute = (typeof ROUTES)[keyof typeof ROUTES];

export type LandingParams = {
  from?: "details";
};

/**
 * Desktop / laptop (web ≥1024): details → login
 * Mobile & tablet: landing → details → landing (from details) → login
 */
export function useAuthFlow() {
  const { isDesktop } = useResponsive();
  const isMobileAuthFlow = !isDesktop;

  const initialAuthRoute: AuthRoute = isMobileAuthFlow
    ? ROUTES.landing
    : ROUTES.details;

  return {
    isMobileAuthFlow,
    isDesktopAuthFlow: isDesktop,
    initialAuthRoute,
    detailsRoute: ROUTES.details,
    landingRoute: ROUTES.landing,
    loginRoute: ROUTES.login,
    /** After details on mobile: second landing visit, then login from landing CTA */
    preLoginLandingParams: { from: "details" } as LandingParams,
  };
}
