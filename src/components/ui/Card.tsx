import { cn } from "@/lib/utils/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#E2ECE8] bg-white shadow-xs",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1 p-5 pb-0", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn("text-base font-bold text-[#183331]", className)}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-[#EEF5F2] p-5 pt-4",
        className
      )}
    >
      {children}
    </div>
  );
}
