import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// In Next.js 16 the middleware entrypoint is `proxy.ts`.
export default createMiddleware(routing);

export const config = {
  // Match all pathnames except:
  // - /api, /admin (internal, not localized), /_next, /_vercel
  // - files containing a dot (e.g. favicon.ico, images)
  matcher: "/((?!api|admin|_next|_vercel|.*\\..*).*)",
};
