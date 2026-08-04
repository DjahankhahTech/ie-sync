"use client";

interface Props {
  /** All IE-SYNC product data is open-source. Never imply classified content. */
  level?: "UNCLASSIFIED//OSINT" | "UNCLASSIFIED" | "CUI";
  note?: string;
}

export function ClassificationBanner({
  level = "UNCLASSIFIED//OSINT",
  note = "OPEN-SOURCE ONLY — NOT FOR OPERATIONAL DECISION WITHOUT HUMAN VALIDATION",
}: Props) {
  return (
    <div className="classification-banner classification-u flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-0.5 px-2">
      <span>// {level} //</span>
      <span className="font-semibold tracking-wide opacity-90 text-[10px] sm:text-[11px]">
        {note}
      </span>
    </div>
  );
}
