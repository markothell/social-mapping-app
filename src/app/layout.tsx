export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-wrapper">
          <header className="app-header">
            <div className="logo">Social Mapping App</div>
          </header>
          <main>{children}</main>
          <footer className="app-footer">
            <p>&copy; {new Date().getFullYear()} Social Mapping App</p>
          </footer>
        </div>
      </body>
    </html>
  );
}