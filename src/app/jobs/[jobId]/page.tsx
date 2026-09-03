import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import JobDetails from "@/components/jobs/JobDetails";

export const dynamic = "force-dynamic";

function parseJobId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return id;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const id = parseJobId(jobId);
  if (id === null) return { title: "Invalid Job - AGENTX" };
  return {
    title: `Job #${id} - AGENTX | Onchain AI Agent Marketplace`,
    description: `Track ERC-8183 APEX job #${id} on BSC Testnet.`,
  };
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const id = parseJobId(jobId);
  if (id === null) notFound();

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <JobDetails jobId={id} />
      </main>
      <Footer />
    </>
  );
}