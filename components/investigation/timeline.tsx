export function Timeline({ items }: { items: { date: string; title?: string; type?: string; officer?: string; text?: string }[] }) {
  return (
    <div className="space-y-5">
      {items.map((item, index) => (
        <div key={`${item.date}-${index}`} className="relative border-l-2 border-slate-200 pl-5">
          <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-blue-600" />
          <div className="text-xs font-semibold text-slate-500">{item.date}</div>
          <div className="mt-1 font-semibold">{item.title ?? item.officer}</div>
          <div className="text-sm text-slate-600">{item.type ?? item.text}</div>
        </div>
      ))}
    </div>
  );
}
