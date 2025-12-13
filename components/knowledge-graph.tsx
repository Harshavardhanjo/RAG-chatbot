"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d"),
  { ssr: false }
);

interface GraphData {
  nodes: { id: string; name: string; type: string; val: number }[];
  links: { source: string; target: string }[];
}

export function KnowledgeGraph() {
  const [data, setData] = useState<GraphData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const graphRef = useRef<any>();

  useEffect(() => {
    if (isOpen && !data) {
      fetch("/api/graph")
        .then((res) => res.json())
        .then((graphData) => {
          setData(graphData);
        })
        .catch((err) => console.error(err));
    }
  }, [isOpen, data]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hidden md:flex">
          Knowledge Graph
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[800px] w-full h-[600px] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
            <DialogTitle>Knowledge Graph</DialogTitle>
        </DialogHeader>
        <div className="flex-1 relative bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
            {!data ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <ForceGraph2D
                    ref={graphRef}
                    graphData={data}
                    backgroundColor={theme === "dark" ? "#09090b" : "#fafafa"}
                    linkColor={() => (theme === "dark" ? "#52525b" : "#d4d4d8")}
                    linkWidth={1.5}
                    nodeCanvasObject={(node: any, ctx, globalScale) => {
                      const label = node.name;
                      const fontSize = 12 / globalScale;
                      ctx.font = `${fontSize}px Sans-Serif`;
                      
                      const size = node.type === 'file' ? 6 : 4;
                      const color = node.type === 'file' ? '#3b82f6' : '#22c55e'; // Blue for file, Green for chunk
                      
                      // Draw Node
                      ctx.beginPath();
                      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                      ctx.fillStyle = color;
                      ctx.fill();

                      // Draw Text
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      ctx.fillStyle = theme === 'dark' ? '#e4e4e7' : '#18181b';
                      ctx.fillText(label, node.x, node.y + size + fontSize);
                    }}
                    nodeRelSize={6}
                    width={800} // Ideally interactive/responsive, keeping fixed for stability in Dialog
                    height={540}
                    cooldownTicks={100}
                    onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
                />
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
