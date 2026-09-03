import Navbar from "@/components/Navbar";
import ComparePage from "@/components/compare/ComparePage";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Compare - AGENTX | Onchain AI Agent Marketplace",
  description:
    "Compare onchain AI agents side by side. Performance, cost, reputation and capabilities.",
};

export default function Compare() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <ComparePage />
      </main>
      <Footer />
    </>
  );
}
