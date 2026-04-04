type FormFieldProps = {
  label: React.ReactNode;
  children: React.ReactNode;
};

export function FormField({ label, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center text-sm font-medium text-zinc-700">{label}</label>
      {children}
    </div>
  );
}
