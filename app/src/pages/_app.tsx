import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import Head from "next/head";
import "../styles/globals.css";

// ssr:false es necesario para que el WalletProvider pueda acceder
// a window.backpack, window.phantom, etc. que solo existen en el browser.
// Sin esto Next.js falla en el servidor al intentar renderizar el HTML.
const WalletContextProvider = dynamic(
  () => import("../components/WalletProvider"),
  {
    ssr: false,
    // loading muestra algo mientras carga el provider
    loading: () => <div style={{ background: "#020817", minHeight: "100vh" }} />,
  }
);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>LogiChain - Trazabilidad Logistica en Solana</title>
        <meta name="description" content="Trazabilidad logistica en Solana" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/icono_TFM2_solana.ico" />
      </Head>
      <WalletContextProvider>
        <Component {...pageProps} />
      </WalletContextProvider>
    </>
  );
}
