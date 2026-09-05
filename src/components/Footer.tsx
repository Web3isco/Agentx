import Link from "next/link";

const footerLinks: Record<string, { label: string; href?: string }[]> = {
  Product: [
    { label: "Discover", href: "/discover" },
    { label: "Compare", href: "/compare" },
    { label: "Benchmark", href: "/benchmark" },
    { label: "Pricing" },
  ],
  Resources: [
    { label: "Documentation" },
    { label: "API Reference" },
    { label: "Agent Guide" },
    { label: "Changelog" },
  ],
  Company: [
    { label: "About" },
    { label: "Blog" },
    { label: "Careers" },
    { label: "Contact" },
  ],
  Legal: [
    { label: "Terms" },
    { label: "Privacy" },
    { label: "Security" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <Link href="/" className="flex items-center gap-2">
              <img src="/main logo.jpg" alt="AGENTX" className="h-8 w-8 rounded-lg object-cover" />
              <span className="text-lg font-semibold tracking-tight text-foreground">
                AGENTX
              </span>
            </Link>
            <p className="mt-3 text-xs text-muted max-w-xs leading-relaxed">
              The onchain AI agent marketplace. Search, verify, compare and hire
              agents built for real outcomes.
            </p>
          </div>

          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                {group}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <Link
                        href={link.href}
                        className="text-xs text-muted hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted/50 cursor-default">
                        {link.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted">
            &copy; {new Date().getFullYear()} AGENTX. All rights reserved.
          </span>
          <div className="flex items-center gap-4">
            <a
              href="https://x.com/Agentx_bnb"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              X · @Agentx_bnb
            </a>
            <span className="text-xs text-muted/50 cursor-default">Twitter</span>
            <span className="text-xs text-muted/50 cursor-default">Discord</span>
            <span className="text-xs text-muted/50 cursor-default">GitHub</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
