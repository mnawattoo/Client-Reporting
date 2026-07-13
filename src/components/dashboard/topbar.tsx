interface TopbarProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, description, actions }: TopbarProps) {
  return (
    <div className="no-print flex items-center justify-between border-b border-border bg-surface px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-ink-primary">{title}</h1>
        {description && <p className="text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
