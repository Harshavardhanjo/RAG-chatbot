"use client";
import { useRouter, usePathname } from "next/navigation";
import { useWindowSize } from "usehooks-ts";
import { memo, useState, useEffect } from "react";

import { ModelSelector } from "@/components/model-selector";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { PlusIcon, } from "./icons";
import { useSidebar } from "./ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import type { VisibilityType, } from "./visibility-selector";
import { KnowledgeGraph } from "./knowledge-graph";
import { KnowledgeBase } from "./knowledge-base";

import { LoadingOverlay } from "@/components/loading-overlay";

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const [isNavigating, setIsNavigating] = useState(false);

  const { width: windowWidth } = useWindowSize();
  const pathname = usePathname();

  useEffect(() => {
      setIsNavigating(false);
  }, [pathname]);

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0"
              onClick={() => {
                setIsNavigating(true);
                router.push("/");
                router.refresh();
              }}
              disabled={pathname === "/"}
            >
              <PlusIcon />
              <span className="md:sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      )}

      {!isReadonly && (
        <ModelSelector
          selectedModelId={selectedModelId}
          className="order-1 md:order-2"
        />
      )}
      
      {!isReadonly && <KnowledgeGraph />}
      {!isReadonly && <KnowledgeBase />}

      {/* {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-1 md:order-3"
        />
      )} */}
      <LoadingOverlay isLoading={isNavigating} />
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
