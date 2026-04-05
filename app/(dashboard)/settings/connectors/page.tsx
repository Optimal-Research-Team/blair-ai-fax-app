"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Brain,
  Phone,
  Cloud,
  MessageSquare,
  Headset,
  Database,
  CheckCircle2,
  XCircle,
  Settings,
  ExternalLink,
  Plug,
} from "lucide-react";
import { toast } from "sonner";

interface Connector {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: "connected" | "disconnected" | "error";
  enabled: boolean;
  category: "emr" | "fax" | "crm" | "messaging";
  lastSync?: string;
  configurable: boolean;
}

const connectors: Connector[] = [
  {
    id: "cerebrum",
    name: "Cerebrum EMR",
    description: "Patient chart filing, provider inbox routing",
    icon: Brain,
    status: "connected",
    enabled: true,
    category: "emr",
    lastSync: "2 min ago",
    configurable: true,
  },
  {
    id: "accuro",
    name: "Accuro EMR",
    description: "Patient data sync, appointment scheduling",
    icon: Database,
    status: "connected",
    enabled: true,
    category: "emr",
    lastSync: "5 min ago",
    configurable: true,
  },
  {
    id: "srfax",
    name: "SRFax",
    description: "Inbound and outbound fax processing",
    icon: Phone,
    status: "connected",
    enabled: true,
    category: "fax",
    lastSync: "Just now",
    configurable: true,
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Referring provider CRM, referral tracking",
    icon: Cloud,
    status: "disconnected",
    enabled: false,
    category: "crm",
    configurable: true,
  },
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Ticket creation for incomplete referrals",
    icon: Headset,
    status: "connected",
    enabled: true,
    category: "crm",
    lastSync: "1 min ago",
    configurable: true,
  },
  {
    id: "slack",
    name: "Slack",
    description: "SLA alerts, urgent fax notifications",
    icon: MessageSquare,
    status: "connected",
    enabled: true,
    category: "messaging",
    lastSync: "Just now",
    configurable: true,
  },
];

const statusConfig = {
  connected: { label: "Connected", className: "text-emerald-700", icon: CheckCircle2 },
  disconnected: { label: "Disconnected", className: "text-muted-foreground", icon: XCircle },
  error: { label: "Error", className: "text-red-700", icon: XCircle },
};

export default function ConnectorsPage() {
  const [connectorStates, setConnectorStates] = useState<Record<string, boolean>>(
    Object.fromEntries(connectors.map((c) => [c.id, c.enabled]))
  );

  const handleToggle = (id: string, enabled: boolean) => {
    setConnectorStates((prev) => ({ ...prev, [id]: enabled }));
    const connector = connectors.find((c) => c.id === id);
    if (connector) {
      toast.success(`${connector.name} ${enabled ? "enabled" : "disabled"}`);
    }
  };

  const handleConfigure = (connector: Connector) => {
    toast.info(`Opening ${connector.name} configuration...`);
  };

  return (
    <div className="space-y-2">
      <PageHeader
        title="Connectors"
        description="Manage external service connections"
        action={
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Plug className="h-3.5 w-3.5" />
            Add Connector
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-px bg-border border border-border">
        {connectors.map((connector) => {
          const Icon = connector.icon;
          const status = statusConfig[connector.status];
          const StatusIcon = status.icon;
          const isEnabled = connectorStates[connector.id];

          return (
            <div
              key={connector.id}
              className={cn(
                "bg-background p-3 flex flex-col gap-2",
                !isEnabled && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", isEnabled ? "text-foreground" : "text-muted-foreground")} />
                  <span className="text-sm font-medium">{connector.name}</span>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => handleToggle(connector.id, checked)}
                  disabled={connector.status === "disconnected"}
                />
              </div>

              <p className="text-xs text-muted-foreground">{connector.description}</p>

              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-1">
                  <StatusIcon className={cn("h-3 w-3", status.className)} />
                  <span className={cn("text-[10px]", status.className)}>{status.label}</span>
                  {connector.lastSync && isEnabled && (
                    <span className="text-[10px] text-muted-foreground ml-1">· {connector.lastSync}</span>
                  )}
                </div>

                {connector.status === "connected" && isEnabled && connector.configurable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2"
                    onClick={() => handleConfigure(connector)}
                  >
                    Configure
                  </Button>
                )}
                {connector.status === "disconnected" && (
                  <Button
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => toast.info("Opening connection wizard...")}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
