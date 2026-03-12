import { useEffect } from "react";
import { useRouter } from "next/router";
import "../styles/globals.css";
import { ToastProvider } from "../components/Toast";

function trackPageView(path) {
  fetch("/api/analytics/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path,
      ua: navigator.userAgent,
      referrer: document.referrer,
    }),
  }).catch(() => {});
}

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Track initial page load
    trackPageView(router.asPath);

    // Track client-side navigations
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
