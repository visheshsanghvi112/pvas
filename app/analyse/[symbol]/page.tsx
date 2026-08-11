import { redirect } from "next/navigation";

export default async function AnalysePage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  redirect(`/analysis/${symbol}`);
}
