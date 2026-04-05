import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { FaxSimulationProvider } from "@/components/layout/fax-simulation-provider";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "256px",
          "--sidebar-width-icon": "61px",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <FaxSimulationProvider />
      <main className="relative w-full min-w-0 flex flex-col h-screen">
        <div className="flex-1 overflow-auto p-3 md:p-6">{children}</div>
      </main>
    </SidebarProvider>
  );
}
