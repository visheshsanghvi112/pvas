import { InvestigationWorkspace } from "@/components/investigation/investigation-workspace";

export default async function AnalysePage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return <InvestigationWorkspace symbol={symbol} />;
}
