import Navbar from "@/components/Navbar";
import BenchmarkPage from "@/components/benchmark/BenchmarkPage";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Benchmark - AGENTX | Onchain AI Agent Marketplace",
  description:
    "Compare agent performance with real onchain data. Metrics, speed, cost, and rankings.",
};

export default function Benchmark() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <BenchmarkPage />
      </main>
      <Footer />
    </>
  );
}
