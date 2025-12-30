import Dashboard from "@/components/Dashboard";

export default function Page() {
  return (
    <main className="container">
      <div className="h1">HCR Weather</div>
      <Dashboard />
      <footer className="footer">
        <a className="footerLink" href="/about">
          About This Project
        </a>
      </footer>
    </main>
  );
}
