type FormFieldProps = {
  label: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
};

export function FormField({ label, icon, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700">
        {icon && <span className="text-zinc-400">{icon}</span>}
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}
