import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/ParticleBackground";
import { BASE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Ad-Nav | Adam Stacey",
    template: "%s | Ad-Nav",
  },
  description:
    "Mapping Success for Teams, Technology, and Transformation. Head of Technology, AI apprentice, and digital strategist.",
  keywords: [
    "Adam Stacey",
    "Ad-Nav",
    "Head of Technology",
    "Compare the Market",
    "AI",
    "Salesforce",
    "Digital Transformation",
  ],
  authors: [{ name: "Adam Stacey" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: BASE_URL,
    siteName: SITE_NAME,
    title: "Ad-Nav | Adam Stacey",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Ad-Nav Blog"
          href="/feed.xml"
        />
      </head>
      <body className="min-h-full flex flex-col scanline-overlay cyber-grid antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": `${BASE_URL}/#website`,
                  url: BASE_URL,
                  name: SITE_NAME,
                  description: SITE_DESCRIPTION,
                  publisher: { "@id": `${BASE_URL}/#adam` },
                  inLanguage: "en-GB",
                },
                {
                  "@type": "Person",
                  "@id": `${BASE_URL}/#adam`,
                  name: "Adam Stacey",
                  jobTitle: "Head of Technology",
                  description:
                    "Head of Technology at Compare the Market. AI apprentice, digital transformation leader, and agent-first builder.",
                  image: `${BASE_URL}/images/adam-headshot.jpg`,
                  url: BASE_URL,
                  worksFor: {
                    "@type": "Organization",
                    name: "Compare the Market",
                    url: "https://www.comparethemarket.com",
                  },
                  sameAs: [
                    "https://www.linkedin.com/in/adamcstacey/",
                    "https://github.com/digital-illumination",
                  ],
                },
              ],
            }),
          }}
        />
        <ParticleBackground />
        <Navbar />
        <main className="flex-1 relative z-10 pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
