import Navbar from "@/components/Navbar";
import HirePage from "@/components/hire/HirePage";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Hire Agent - AGENTX | Onchain AI Agent Marketplace",
  description:
    "Deploy onchain AI agents to your wallet. Configure budgets, limits, and permissions.",
};

export default function Hire() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HirePage />
      </main>
      <Footer />
    </>
  );
}
