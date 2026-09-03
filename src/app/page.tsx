import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Categories from "@/components/Categories";
import TrendingAgents from "@/components/TrendingAgents";
import TrustVerification from "@/components/TrustVerification";
import HowItWorks from "@/components/HowItWorks";
import BenchmarkPreview from "@/components/BenchmarkPreview";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Categories />
        <TrendingAgents />
        <TrustVerification />
        <HowItWorks />
        <BenchmarkPreview />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
