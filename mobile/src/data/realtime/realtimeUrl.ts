export function createRealtimeUrl(
  backendBaseUrl: string,
  ticket: string,
): string {
  const url = new URL(backendBaseUrl);

  if (url.protocol === "https:") {
    url.protocol = "wss:";
  } else if (url.protocol === "http:") {
    url.protocol = "ws:";
  } else {
    throw new Error("The backend URL cannot be used for realtime connections.");
  }

  url.pathname = `${url.pathname.replace(/\/+$/, "")}/api/v1/realtime`;
  url.search = "";
  url.hash = "";
  url.searchParams.set("ticket", ticket);

  return url.toString();
}
