import Link from "next/link";
import { AlertTriangle, ArrowLeft, Compass, FileSearch } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-20 pb-16 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-border bg-surface p-12 text-center max-w-2xl mx-auto">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 mx-auto mb-4">
              <FileSearch size={28} className="text-accent" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
              Page not found
            </h1>
            <p className="text-sm text-muted max-w-md mx-auto mb-6">
              The page you&apos;re looking for doesn&apos;t exist or may have been
              moved. You can head back to the marketplace to keep exploring onchain
              AI agents.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/discover"
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-xs font-semibold text-black hover:bg-accent-hover transition-colors"
              >
                <Compass size={14} />
                Browse Agents
              </Link>
              <Link
                href="/hire"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-5 py-2.5 text-xs font-medium text-muted hover:text-foreground hover:border-accent/20 transition-colors"
              >
                <ArrowLeft size={14} />
                Back to Hire
              </Link>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted">
              <AlertTriangle size={11} className="text-accent" />
              <span>Try a valid agent or job ID, or browse from Discover.</span>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
