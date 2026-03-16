import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import "../styles/globals.css";
import { ToastProvider } from "../components/Toast";

let pendingTrack = null;

function trackPageView(path) {
  clearTimeout(pendingTrack);
  pendingTrack = setTimeout(() => {
    fetch("/api/analytics/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path,
        ua: navigator.userAgent,
        referrer: document.referrer,
      }),
    }).catch(() => {});
  }, 300);
}

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      trackPageView(router.asPath);
      tracked.current = true;
    }

    const handleRouteChange = (url) => trackPageView(url);
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => router.events.off("routeChangeComplete", handleRouteChange);
  }, [router]);

  return (
    <ToastProvider>
      <Component {...pageProps} />
    </ToastProvider>
  );
}

export default MyApp;
