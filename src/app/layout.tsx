import type { Metadata } from "next";
import "./globals.css";
import { FolderProvider } from "@/context/FolderContext";
import { ImageProvider } from "@/context/ImageContext";
import { SearchProvider } from "@/context/SearchContext";
import { AboutProvider } from "@/context/AboutContext";
import { NavigationLayout } from "@/components/NavigationLayout";

const SITE_URL = "https://abishek-pencil.vercel.app";
const SITE_TITLE = "Abishek — Visual Artist & Digital Illustrator";
const SITE_DESCRIPTION =
  "Portfolio of Abishek — pencil sketches, digital art, 3D animation, and visual storytelling, including Vizag's biggest wall art. Explore concept art, illustration, cinematography, and graphic design.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Pencil — Abishek",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Abishek",
    "Pencil",
    "visual artist",
    "pencil sketches",
    "digital art",
    "3D animation",
    "concept art",
    "illustration",
    "graphic design",
    "Vizag wall art",
    "Visakhapatnam artist",
  ],
  authors: [{ name: "Abishek" }],
  creator: "Abishek",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/hero-image.jpeg",
        width: 1200,
        height: 900,
        alt: "Abishek in front of a large-scale mural artwork",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/hero-image.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased font-sans"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Host+Grotesk:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-[#f0f2f5] dark:bg-zinc-950">
        <FolderProvider>
          <ImageProvider>
            <SearchProvider>
              <AboutProvider>
                <NavigationLayout>
                  {children}
                </NavigationLayout>
              </AboutProvider>
            </SearchProvider>
          </ImageProvider>
        </FolderProvider>
      </body>
    </html>
  );
}
