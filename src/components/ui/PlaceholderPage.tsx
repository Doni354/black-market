interface PlaceholderPageProps {
  title: string;
  description: string;
  phase: string;
}

export function PlaceholderPage({ title, description, phase }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-[#183331]">{title}</h1>
        <p className="mt-1 text-sm text-[#52706C]">{description}</p>
      </div>
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-[#C4D9D2] bg-white py-20 shadow-xs">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#D5E4DF] bg-[#F4F9F7]">
            <svg className="h-6 w-6 text-[#7A9C96]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-[#183331]">Belum diimplementasikan</p>
          <p className="mt-1 text-xs text-[#52706C]">
            Fitur ini akan tersedia pada {phase}
          </p>
        </div>
      </div>
    </div>
  );
}
