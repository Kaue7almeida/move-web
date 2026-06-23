import Link from "next/link";
import {
  Check,
  Circle,
  Clock,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

import type { ChecklistSummary } from "./app-utils";

/* ─── Page header ─── */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ─── Metric card (small) ─── */
export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="card-themed rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        {Icon && <Icon size={14} className="text-muted" strokeWidth={1.8} />}
      </div>
      <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {detail && (
        <p className="mt-1 text-xs text-muted">{detail}</p>
      )}
    </div>
  );
}

/* ─── Vertical stepper checklist ─── */
export function StepperChecklist({
  summary,
}: {
  summary: ChecklistSummary;
}) {
  return (
    <div className="card-themed rounded-xl border border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Primeiros passos
          </h3>
          <p className="mt-0.5 text-xs text-muted">
            {summary.completedCount} de {summary.totalCount} concluídos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-strong">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{
                width: `${Math.max(4, Math.round((summary.completedCount / summary.totalCount) * 100))}%`,
              }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {Math.round((summary.completedCount / summary.totalCount) * 100)}%
          </span>
        </div>
      </div>

      {/* Steps */}
      <ul className="divide-y divide-border">
        {summary.items.map((item, index) => {
          const isNext = !item.completed && summary.items.slice(0, index).every((prev) => prev.completed);

          return (
            <li key={item.id} className="flex gap-4 px-5 py-4">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                {item.completed ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                    <Check size={14} className="text-accent-on" strokeWidth={2.5} />
                  </div>
                ) : isNext ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-accent">
                    <Circle size={8} className="fill-accent text-accent" />
                  </div>
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border-strong">
                    <span className="text-[10px] font-medium text-muted">
                      {index + 1}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={[
                        "text-sm font-medium",
                        item.completed
                          ? "text-muted line-through"
                          : isNext
                            ? "text-foreground"
                            : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">
                      {item.description}
                    </p>
                  </div>

                  {/* CTA */}
                  {!item.completed && (
                    <div className="shrink-0">
                      {item.disabled ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-surface-strong px-2 py-1 text-[10px] font-medium text-muted">
                          <Clock size={10} />
                          {item.disabledLabel ?? "Em breve"}
                        </span>
                      ) : item.href ? (
                        <Link
                          href={item.href}
                          className={[
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                            isNext
                              ? "bg-accent text-accent-on hover:bg-accent-hover"
                              : "bg-surface-strong text-foreground hover:bg-surface-hover",
                          ].join(" ")}
                        >
                          {item.ctaLabel}
                          <ArrowRight size={12} />
                        </Link>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── Quick action card ─── */
export function QuickAction({
  href,
  label,
  description,
  icon: Icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="card-themed group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-hover"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-muted text-accent transition-colors group-hover:bg-accent-soft">
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted">{description}</p>
      </div>
      <ArrowRight
        size={16}
        className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground"
      />
    </Link>
  );
}

/* ─── Empty state ─── */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-muted">
        <Icon size={24} className="text-accent" strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-on transition-colors hover:bg-accent-hover"
        >
          {action.label}
          <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}

/* ─── Placeholder section (for coming-soon pages) ─── */
export function PlaceholderSection({
  icon: Icon,
  title,
  description,
  features,
  ctaHref,
  ctaLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  features?: string[];
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-muted">
          <Icon size={28} className="text-accent" strokeWidth={1.5} />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
          {description}
        </p>

        {features && features.length > 0 && (
          <ul className="mt-6 space-y-2">
            {features.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <div className="h-1 w-1 rounded-full bg-accent" />
                {feature}
              </li>
            ))}
          </ul>
        )}

        {ctaHref && ctaLabel && (
          <Link
            href={ctaHref}
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            {ctaLabel}
            <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ─── Section card ─── */
export function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card-themed rounded-xl border border-border bg-surface p-5 ${className}`}>
      {children}
    </div>
  );
}

/* ─── Role guard (shows "this area isn't for you" in clean way) ─── */
export function RoleGuard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
        <p className="text-sm text-muted">
          Essa seção não está disponível para o seu perfil.
        </p>
        <Link
          href="/app"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          Voltar ao início
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
