"use client";

interface Props {
  level?: "TS//SCI" | "SECRET//NOFORN" | "SECRET" | "CONFIDENTIAL" | "UNCLASSIFIED";
}

export function ClassificationBanner({ level = "SECRET//NOFORN" }: Props) {
  const classes: Record<string, string> = {
    "TS//SCI": "classification-ts",
    "SECRET//NOFORN": "classification-s",
    "SECRET": "classification-s",
    "CONFIDENTIAL": "classification-c",
    "UNCLASSIFIED": "classification-u",
  };
  const cls = classes[level] ?? "classification-s";

  return (
    <div className={`classification-banner ${cls}`}>
      ⚠ {level} ⚠
    </div>
  );
}
