import "nextra-theme-docs/style.css";

import { Banner, Head } from "nextra/components";
/* eslint-env node */
import { Footer, Layout, Navbar } from "nextra-theme-docs";

import { GlobalStylings } from "./GlobalStylings";
import { getPageMap } from "nextra/page-map";

export const metadata = {
  metadataBase: new URL("https://superbridge.dev"),
  title: {
    template: "%s - superbridge",
  },
  description:
    "superbridge: a simple and powerful way to communicate between main and renderer processes in Electron",
  applicationName: "superbridge",
  generator: "Next.js",
  appleWebApp: {
    title: "superbridge",
  },
  // other: {
  //   "msapplication-TileImage": "/ms-icon-144x144.png",
  //   "msapplication-TileColor": "#fff",
  // },
  twitter: {
    site: "https://superbridge.dev",
    card: "summary_large_image",
  },
  openGraph: {
    type: "website",
    url: "https://superbridge.dev",
    title: "superbridge",
    description:
      "superbridge: a simple and powerful way to communicate between main and renderer processes in Electron",
    images: [
      {
        url: "https://superbridge.dev/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "superbridge",
      },
    ],
  },
};

export default async function RootLayout({ children }) {
  const navbar = (
    <Navbar
      logo={
        <div>
          <b>superbridge</b>
        </div>
      }
      projectLink="https://github.com/pie6k/superbridge"
    />
  );
  const pageMap = await getPageMap();
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head faviconGlyph="✦" />
      <body>
        <Layout
          // banner={<Banner storageKey="Nextra 2">Nextra 2 Alpha</Banner>}
          navbar={navbar}
          footer={
            <Footer>MIT {new Date().getFullYear()} © superbridge.</Footer>
          }
          editLink="Edit this page on GitHub"
          docsRepositoryBase="https://github.com/pie6k/superbridge/blob/main/docs"
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          pageMap={pageMap}
        >
          <GlobalStylings />
          {children}
        </Layout>
      </body>
    </html>
  );
}
