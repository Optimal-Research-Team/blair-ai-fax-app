"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockIntegrations } from "@/data/mock-integrations";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import {
  Phone,
  Database,
  Brain,
  Cloud,
  LifeBuoy,
  MessageSquare,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

const ICON_MAP: Record<string, React.ElementType> = {
  Phone, Database, Brain, Cloud, LifeBuoy, MessageSquare,
};

const STATUS_CONFIG = {
  connected: { label: "Connected", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  pending: { label: "Pending Setup", color: "bg-amber-100 text-amber-700", icon: Clock },
  disconnected: { label: "Disconnected", color: "bg-muted text-muted-foreground", icon: XCircle },
  error: { label: "Error", color: "bg-red-100 text-red-700", icon: XCircle },
} as const;

export default function IntegrationsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Integrations" description="Manage external service connections and APIs" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockIntegrations.map((integration) => {
          const Icon = ICON_MAP[integration.icon] || Settings;
          const status = STATUS_CONFIG[integration.status];
          const StatusIcon = status.icon;
          return (
            <Card key={integration.id} className={cn("transition-all", integration.status === "connected" && "border-emerald-200")}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-sm", integration.status === "connected" ? "bg-emerald-50" : "bg-muted")}>
                      <Icon className={cn("h-5 w-5", integration.status === "connected" ? "text-emerald-600" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{integration.name}</CardTitle>
                      <Badge variant="secondary" className="text-[9px] mt-0.5">{integration.category}</Badge>
                    </div>
                  </div>
                  <Badge className={cn("text-[10px]", status.color)} variant="secondary">
                    <StatusIcon className="h-3 w-3 mr-0.5" />
                    {status.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{integration.description}</p>
                {integration.lastSync && (
                  <p className="text-[10px] text-muted-foreground">Last sync: {formatRelativeTime(integration.lastSync)}</p>
                )}
                <div className="flex gap-2">
                  {integration.status === "connected" && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.info("Syncing...")}>
                        <RefreshCw className="h-3 w-3 mr-1" />Sync
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
                        <Settings className="h-3 w-3 mr-1" />Configure
                      </Button>
                    </>
                  )}
                  {integration.status === "pending" && (
                    <Button size="sm" className="h-7 text-xs" onClick={() => toast.info("Setup wizard...")}>Complete Setup</Button>
                  )}
                  {integration.status === "disconnected" && (
                    <Button size="sm" className="h-7 text-xs" onClick={() => toast.info("Connecting...")}>Connect</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
