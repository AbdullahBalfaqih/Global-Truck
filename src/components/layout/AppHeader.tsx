
"use client";

import Link from "next/link";
import { Truck, Menu } from "lucide-react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { UserNav } from "./UserNav";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface AppHeaderProps {
    session: any;
}

export function AppHeader({ session }: AppHeaderProps) {
    const { isMobile, toggleSidebar } = useSidebar();

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 print:hidden">

            {isMobile && (
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                </Button>
            )}

            <div className="flex items-center gap-2">
                {!isMobile && ( // Hide the desktop trigger icon on mobile
                    <SidebarTrigger className="hidden sm:flex" />
                )}
                <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-primary">
                    <Truck className="h-6 w-6" />
                </Link>
            </div>

            <div className="ml-auto flex items-center gap-4">
                <UserNav session={session} />
            </div>
        </header>
    );
}
