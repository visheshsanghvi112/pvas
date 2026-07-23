import { InvestigationWorkspace } from "@/components/investigation/investigation-workspace";

export default async function InvestigationPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return <InvestigationWorkspace symbol={symbol} />;
}
