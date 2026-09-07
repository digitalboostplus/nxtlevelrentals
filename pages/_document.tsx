import { Html, Head, Main, NextScript } from 'next/document';

// Manrope is the brand face across the design canvases. Loading it here, rather than
// through an @import in globals.css, survives the production CSS build, which drops
// external @import rules and silently left the live site on the Segoe UI fallback.
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
