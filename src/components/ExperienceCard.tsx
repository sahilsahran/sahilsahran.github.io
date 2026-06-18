import { cn } from "@/lib/utils";
import type { Experience } from "@/data/experiences";

interface ExperienceCardProps {
  experience: Experience;
  isSelected?: boolean;
  isFrontFace?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}

export function ExperienceCard({ experience, isSelected, isFrontFace, onClick, style }: ExperienceCardProps) {
  let badgeStyle = {};
  if (experience.type === "Work") badgeStyle = { background: "rgba(196, 238, 240, 0.12)", color: "#C4EEF0" };
  else if (experience.type === "Project") badgeStyle = { background: "rgba(164, 198, 211, 0.12)", color: "#A4C6D3" };
  else if (experience.type === "Research") badgeStyle = { background: "rgba(75, 99, 118, 0.2)", color: "#A4C6D3" };

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-[12px] p-[20px] sm:p-[24px] border w-full",
        isFrontFace ? "h-full" : "mb-[12px] transition duration-200",
        !isFrontFace && (isSelected
          ? "bg-[rgba(196,238,240,0.04)] border-[rgba(196,238,240,0.4)]"
          : "bg-[#2E353B] border-[rgba(54,62,69,0.8)] hover:border-[rgba(196,238,240,0.2)] hover:-translate-y-[2px] cursor-pointer"),
        isFrontFace && "bg-[#2E353B] border-[rgba(54,62,69,0.8)]"
      )}
      style={{
        boxShadow: isFrontFace 
          ? "none" 
          : (isSelected ? "0 12px 32px rgba(0,0,0,0.6)" : "0 4px 20px rgba(0,0,0,0.4)"),
        ...style,
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <span
          className="px-[8px] py-[2px] rounded-full font-sans text-[10px] font-semibold tracking-[0.08em] uppercase"
          style={badgeStyle}
        >
          {experience.type}
        </span>
        <span className="font-mono text-[11px] text-[rgba(210,220,229,0.35)]">
          {experience.date}
        </span>
      </div>

      <h3 className="font-sans text-[16px] font-bold text-[#D2DCE5] mb-1">
        {experience.title}
      </h3>
      
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
        <span className="font-sans text-[13px] text-[rgba(210,220,229,0.6)]">
          {experience.company}
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {experience.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-full bg-[rgba(54,62,69,0.8)] text-[rgba(210,220,229,0.5)] font-sans text-[9px] font-medium"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      <p className="font-sans text-[13px] text-[rgba(210,220,229,0.6)] mt-[6px]">
        {experience.summary}
      </p>
    </div>
  );
}
