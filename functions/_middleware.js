// Cloudflare Pages Function: redirect the production *.pages.dev hostname
// to the custom domain, keeping the path and query string.
//
// Only the exact production host is redirected, so preview deployments
// (e.g. abc123.backpackersbible2.pages.dev) keep working for testing.

const PAGES_HOST = "backpackersbible2.pages.dev";
const CUSTOM_ORIGIN = "https://www.backpackersbible.com";

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === PAGES_HOST) {
    return Response.redirect(CUSTOM_ORIGIN + url.pathname + url.search, 301);
  }

  return context.next();
}
