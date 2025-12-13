"use client";

import { useEffect, useState } from "react";
import type { User } from "next-auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

import { PlusIcon } from "@/components/icons";
import { SidebarHistory } from "@/components/sidebar-history";
import { SidebarUserNav } from "@/components/sidebar-user-nav";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { UserDocs } from "@/components/user-docs"; // You'll need to create this component
import { ArrowLeft } from "lucide-react";

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const [isDocsRoute, setIsDocsRoute] = useState(false);

  useEffect(() => {
    setIsDocsRoute(pathname?.startsWith("/docs") ?? false);
  }, [pathname]);

  const handleNewChat = () => {
    setOpenMobile(false);
    router.push("/");
    router.refresh();
  };

  return !isDocsRoute ? (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-2">
        <SidebarMenu>
          <div className="flex items-center justify-between">
            {isDocsRoute ? (
              <div
                onClick={() => setOpenMobile(false)}
                className="flex items-center gap-3"
              >
                <Link href="/docs" className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors">
                  <div className="p-1 rounded-md bg-muted/50 border">
                     <ArrowLeft className="h-4 w-4" />
                  </div>
                   <span className="font-medium tracking-tight">My Documents</span>
                </Link>
              </div>
            ) : (
              <div
                onClick={() => setOpenMobile(false)}
                className="flex items-center gap-3"
              >
                 <span className="font-medium tracking-tight text-foreground/90 pl-1">
                   My Chats
                 </span>
              </div>
            )}
            {!isDocsRoute ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleNewChat}
                    className="p-2 h-fit"
                  >
                    <PlusIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="end">
                  {isDocsRoute ? "New Document" : "New Chat"}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => router.push("/docs/new")}
                    className="p-2 h-fit"
                  >
                    <PlusIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="end">New Document</TooltipContent>
              </Tooltip>
            )}
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-4 py-2">
        {isDocsRoute ? (
          <UserDocs user={user} />
        ) : (
          <SidebarHistory user={user} />
        )}
      </SidebarContent>
      <SidebarFooter className="border-t px-4 py-2">
        {user && <SidebarUserNav user={user} />}
      </SidebarFooter>
    </Sidebar>
  ) : null;
}
