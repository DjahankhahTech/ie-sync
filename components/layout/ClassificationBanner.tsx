"use client";

interface Props {
  level?: "UNCLASSIFIED//OSINT" | "UNCLASSIFIED" | "CUI";
  note?: string;
}

export function ClassificationBanner({
  level = "UNCLASSIFIED//OSINT",
  note = "Open-source only · AI drafts must be checked by a human analyst · Do not base operational decisions on this tool alone",
}: Props) {
  return (
    <div className="classification-banner classification-u flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-0.5 px-3">
      <span>{level}</span>
      <span className="font-medium tracking-normal normal-case text-[11px] sm:text-[12px] opacity-90">
        {note}
      </span>
    </div>
  );
}
