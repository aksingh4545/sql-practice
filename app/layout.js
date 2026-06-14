import "./globals.css";

export const metadata = {
  title: "SQLVis — Interactive SQL Learning Platform",
  description: "Learn SQL visually with real-time query visualization, animated table transformations, gamification, and an interactive editor. Make SQL feel like a simulation.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
