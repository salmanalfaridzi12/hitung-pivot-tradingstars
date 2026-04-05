import "./globals.css";

export const metadata = {
  title: "Pivot Analyzer - TradingStars",
  description: "Advanced Pivot Point Analyzer for IDX Traders by TradingStars",
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
