import Navbar from "@/components/Navbar";
import DiscoverPage from "@/components/discover/DiscoverPage";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Discover - AGENTX | Onchain AI Agent Marketplace",
  description:
    "Browse, search, compare and hire onchain AI agents.",
};

export default function Discover() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <DiscoverPage />
      </main>
      <Footer />
    </>
  );
}
