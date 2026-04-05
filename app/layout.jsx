import "./globals.css";

export const metadata = {
  title: "Pivot Analyzer - TradingStars",
  description: "Advanced Pivot Point Analyzer for IDX Traders by TradingStars",
  icons: {
    icon: "/logo-ts.png",
    shortcut: "/logo-ts.png",
    apple: "/logo-ts.png",
  },
  openGraph: {
    title: "Pivot Analyzer - TradingStars",
    description: "Advanced Pivot Point Analyzer for IDX Traders by TradingStars",
    images: [{ url: "/logo-ts.png", width: 800, height: 800, alt: "TradingStars Logo" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pivot Analyzer - TradingStars",
    description: "Advanced Pivot Point Analyzer for IDX Traders by TradingStars",
    images: ["/logo-ts.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body style={{ backgroundColor: "#0f172a", color: "#ffffff", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
