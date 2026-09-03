import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import AgentProfile from "@/components/agent/AgentProfile";
import { getAgentDetail, enrichOnchainAgentDetail } from "@/components/agent/agent-detail-data";
import { agents } from "@/components/discover/agents-data";
import Footer from "@/components/Footer";

export function generateStaticParams() {
  return agents.map((agent) => ({ id: agent.id }));
}

async function resolveAgent(id: string) {
  if (!id.startsWith("onchain-")) return getAgentDetail(id);
  try {
    return (await enrichOnchainAgentDetail(id)) ?? getAgentDetail(id);
  } catch {
    // If the onchain read fails, fall back to the synthesized offline profile
    // instead of crashing SSR with the default error screen.
    return getAgentDetail(id);
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await resolveAgent(id);
  if (!agent) return { title: "Agent Not Found - AGENTX" };
  return {
    title: `${agent.name} - AGENTX`,
    description: agent.description,
  };
}

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await resolveAgent(id);
  if (!agent) notFound();

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <AgentProfile agent={agent} />
      </main>
      <Footer />
    </>
  );
}
