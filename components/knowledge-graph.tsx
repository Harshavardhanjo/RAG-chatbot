"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Loader2, FileText, Database, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d"),
  { ssr: false }
);

interface GraphNode {
  id: string;
  name: string;
  type: "file" | "resource";
  val: number;
  fullContent?: string;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function KnowledgeGraph() {
  const [data, setData] = useState<GraphData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
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

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;
    const isDark = theme === 'dark';

    if (node.type === 'file') {
        // Draw File Icon (Simplified as a rectangle with text)
        const size = 12;
        ctx.fillStyle = isDark ? '#60a5fa' : '#2563eb'; // Blue
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, size / 2, 0, 2 * Math.PI, false);
        ctx.fill();

        // Icon/Text distinction
        // We render a simple text emoji or character inside for "File" 
        // because drawing paths manually on canvas is complex and slow
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.font = `${fontSize * 1.5}px Sans-Serif`;
        // ctx.fillText('📄', node.x, node.y + 1); // Document emoji
    } else {
        // Draw Chunk Dot
        const size = 4;
        ctx.fillStyle = isDark ? '#4ade80' : '#16a34a'; // Green
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
        ctx.fill();
    }

    // Draw Label below
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isDark ? '#e4e4e7' : '#18181b';
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.fillText(label, node.x, node.y + (node.type === 'file' ? 8 : 6));
  }, [theme]);

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
    // Center graph on node?
    // graphRef.current?.centerAt(node.x, node.y, 1000);
    // graphRef.current?.zoom(8, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hidden md:flex gap-2">
            <Database className="w-4 h-4" />
            Knowledge Graph
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[900px] w-full h-[600px] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-4 border-b flex-shrink-0">
            <DialogTitle>Knowledge Graph</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 relative flex overflow-hidden">
            {/* Graph Area */}
            <div className={`flex-1 relative ${selectedNode ? 'w-2/3' : 'w-full'} transition-all duration-300`}>
                {!data ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                         <ForceGraph2D
                            ref={graphRef}
                            graphData={data}
                            backgroundColor={theme === "dark" ? "#09090b" : "#ffffff"}
                            linkColor={() => (theme === "dark" ? "#52525b" : "#e4e4e7")}
                            linkWidth={1}
                            nodeCanvasObject={paintNode}
                            nodeRelSize={6}
                            onNodeClick={handleNodeClick}
                            width={selectedNode ? 550 : 880} // Approx width adjustment, ideally dynamic resize
                            height={540}
                            cooldownTicks={100}
                        />
                        
                        {/* Legend Overlay */}
                        <div className="absolute bottom-4 left-4 p-3 bg-background/80 backdrop-blur-sm border rounded-lg shadow-sm text-xs space-y-2 pointer-events-none">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-blue-500" />
                                <span className="font-medium text-foreground">Document</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-green-500" />
                                <span className="font-medium text-foreground">Memory Chunk</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1 pt-1 border-t">
                                Click visible nodes to inspect
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Details Panel */}
            <AnimatePresence>
                {selectedNode && (
                    <motion.div 
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="absolute right-0 top-0 bottom-0 w-[350px] bg-background border-l shadow-xl z-10 flex flex-col"
                    >
                        <div className="p-4 border-b flex items-start justify-between bg-muted/30">
                            <div>
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                    {selectedNode.type === 'file' ? 'Source File' : 'Knowledge Chunk'}
                                </div>
                                <h3 className="font-semibold text-sm leading-tight">
                                    {selectedNode.type === 'file' ? selectedNode.name : 'Memory Fragment'}
                                </h3>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedNode(null)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {selectedNode.type === 'file' ? (
                                    <div className="space-y-2">
                                        <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg flex items-center gap-3">
                                            <FileText className="w-5 h-5" />
                                            <span className="text-sm font-medium">Root Document</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            This is a master document. It contains connected memory chunks that the AI uses to answer your questions.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium text-foreground">Content Preview</div>
                                        <div className="p-3 bg-muted/50 rounded-lg text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                            {selectedNode.fullContent || "No text content available."}
                                        </div>
                                        <p className="text-xs text-muted-foreground italic">
                                            This snippet was semantically extracted from the source file.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
