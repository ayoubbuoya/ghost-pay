type BadgeVariant = "active" | "inactive" | "encrypted";

interface BadgeProps {
  variant: BadgeVariant;
  children: string;
}

const variants: Record<BadgeVariant, string> = {
  active: "bg-success/20 text-success border-success/30",
  inactive: "bg-danger/20 text-danger border-danger/30",
  encrypted: "bg-ghost-500/20 text-ghost-200 border-ghost-500/30",
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]}`}
    >
      {variant === "encrypted" && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )}
      {children}
    </span>
  );
}
