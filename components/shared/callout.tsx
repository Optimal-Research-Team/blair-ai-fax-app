import { ReactNode } from "react";
import { AlertTriangle, Info, CheckCircle2, XCircle } from "lucide-react";
import { CALLOUT_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type CalloutVariant = "warning" | "info" | "error" | "success";

const DEFAULT_ICONS: Record<CalloutVariant, ReactNode> = {
  warning: <AlertTriangle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
  error: <XCircle className="h-4 w-4" />,
  success: <CheckCircle2 className="h-4 w-4" />,
};

interface CalloutProps {
  variant: CalloutVariant;
  /** Override the default icon for this variant */
  icon?: ReactNode;
  /** Heading text (rendered as bold text) */
  heading?: string;
  /** Body text (rendered below heading) */
  body?: string;
  /** Custom content — replaces heading+body when provided */
  children?: ReactNode;
  className?: string;
}

export function Callout({
  variant,
  icon,
  heading,
  body,
  children,
  className,
}: CalloutProps) {
  const colors = CALLOUT_COLORS[variant];

  return (
    <div className={cn(`p-3 ${colors.bg} border ${colors.border}`, className)}>
      <div className="flex items-start gap-2">
        <div className={`${colors.icon} mt-0.5 shrink-0`}>
          {icon ?? DEFAULT_ICONS[variant]}
        </div>
        {children ? (
          <div className="flex-1">{children}</div>
        ) : (
          <div className="flex-1">
            {heading && (
              <p className={`text-sm font-medium ${colors.heading}`}>{heading}</p>
            )}
            {body && (
              <p className={`text-xs ${colors.body} mt-1`}>{body}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
