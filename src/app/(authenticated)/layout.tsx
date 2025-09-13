
import { AppHeader } from "@/components/layout/AppHeader";
import { SidebarNav } from "@/components/layout/SidebarNav";
import {
    Sidebar,
    SidebarProvider,
    SidebarRail,
    SidebarInset,
} from "@/components/ui/sidebar";
import type { UserRole } from "@/types";
import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";

export default async function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        console.log("AuthenticatedLayout: No active session, redirecting to login.");
        redirect("/");
    }

    const userRole: UserRole = session.role || "BranchEmployee";

    console.log(`DEBUG: AuthenticatedLayout is rendering with userRole: ${userRole} for user: ${session.name}`);

    return (
        <SidebarProvider defaultOpen>
            <Sidebar collapsible="icon" side="right" className="print-hide">
                <SidebarNav
                    userRole={userRole}
                />
                <SidebarRail className="print-hide" />
            </Sidebar>
            <SidebarInset className="flex flex-col print-main-content">
                <AppHeader session={session} />
                <main className="flex-1 overflow-auto p-4 sm:p-6">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
