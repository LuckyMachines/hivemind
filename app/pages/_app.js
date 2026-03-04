import "../styles/globals.css";
import "semantic-ui-css/semantic.min.css";
import { ToastProvider } from "../components/Toast";

function MyApp({ Component, pageProps }) {
  return (
    <ToastProvider>
      <Component {...pageProps} />
    </ToastProvider>
  );
}

export default MyApp;
