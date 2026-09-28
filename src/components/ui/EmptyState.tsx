interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-zinc-500">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-zinc-200">{title}</h3>
        {description && (
          <p className="text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
