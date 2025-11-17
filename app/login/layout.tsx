import ClientLayoutWrapper from "../ClientLayoutWrapper";

export const metadata = {
  title: "CrowdPlaces",
  description: "Discover places easily",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}
