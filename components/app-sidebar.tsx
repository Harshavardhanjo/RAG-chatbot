"use client";

import type { User } from "next-auth";
import { useRouter } from "next/navigation";
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

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  const handleNewChat = () => {
    setOpenMobile(false);
    router.push("/");
    router.refresh();
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-2">
        <SidebarMenu>
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setOpenMobile(false)}
              className="flex items-center gap-3"
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
                Chatbot
              </span>
            </Link>
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
              <TooltipContent align="end">New Chat</TooltipContent>
            </Tooltip>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-4 py-2">
        <SidebarHistory user={user} />
      </SidebarContent>
      <SidebarFooter className="border-t px-4 py-2">
        {user && <SidebarUserNav user={user} />}
      </SidebarFooter>
    </Sidebar>
  );
}
