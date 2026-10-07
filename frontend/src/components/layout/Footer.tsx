"use client";
export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 py-6 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">CertMasterAI</span>
          <span>·</span>
          <span>AI-Powered Microsoft Certification Practice</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Powered by</span>
          <img src="/perficient-logo.svg" alt="Perficient" className="h-4 opacity-70 dark:brightness-0 dark:invert dark:opacity-100" />
        </div>
      </div>
    </footer>
  );
}
