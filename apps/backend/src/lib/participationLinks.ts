export function participationAppBaseUrl() {
  const appUrl =
    process.env.PARTICIPATION_APP_URL ?? "http://localhost:5173/participation";
  return appUrl.split(/[?#]/u, 1)[0].replace(/\/+$/u, "");
}

export function participationLinkFromCode(code: string) {
  return `${participationAppBaseUrl()}/${encodeURIComponent(code)}`;
}
