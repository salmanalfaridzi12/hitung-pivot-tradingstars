import "./globals.css";

export const metadata = {
  title: "Pivot Analyzer - TradingStars",
  description: "Advanced Pivot Point Analyzer for IDX Traders by TradingStars",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
