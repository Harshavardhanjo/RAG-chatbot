
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Cpu, Database, Split, CheckCircle2, ArrowRight, Loader2, Code, Terminal } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  isOpen: boolean;
  events: any[]; // Stream of events
  onClose: () => void;
};

export function RagProcessViewer({ isOpen, events, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [events, autoScroll]);

  const isComplete = events.some(e => e.status === 'complete');

  return (
    <Dialog open={isOpen} onOpenChange={() => { /* Prevent closing */ }}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col pointer-events-auto bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader className="border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Terminal size={20} />
             </div>
             <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                    <DialogTitle className="text-xl font-mono">Agent Processing Feed</DialogTitle>
                    {events.findLast(e => e.type === 'progress') && (
                        <span className="text-xs font-mono text-zinc-500">
                            {events.findLast(e => e.type === 'progress').percentage}%
                        </span>
                    )}
                </div>
                
                {/* Progress Bar */}
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-blue-500 transition-all duration-300 ease-out"
                        style={{ width: `${events.findLast(e => e.type === 'progress')?.percentage || 0}%` }}
                    />
                </div>
                
                <DialogDescription className="text-zinc-500 font-mono text-xs mt-2">
                    Live stream of ingestion activities and chunk generation.
                </DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden relative" ref={scrollRef}>
            <ScrollArea className="h-full w-full p-6">
                <div className="space-y-4">
                    {events.map((event, idx) => (
                        <EventRow key={idx} event={event} index={idx} />
                    ))}
                    {!isComplete && (
                         <div className="flex items-center gap-2 text-zinc-500 text-sm font-mono animate-pulse pl-4 border-l-2 border-zinc-800">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Agent is working...
                         </div>
                    )}
                     {isComplete && (
                         <div className="flex items-center gap-2 text-green-500 text-sm font-mono pl-4 border-l-2 border-green-500 bg-green-500/5 p-2 rounded-r">
                            <CheckCircle2 className="h-4 w-4" />
                            Processing Complete.
                         </div>
                    )}
                </div>
            </ScrollArea>
        </div>

        <div className="p-4 border-t border-zinc-900 flex justify-end">
            <Button 
                onClick={onClose} 
                disabled={!isComplete}
                variant={isComplete ? "default" : "secondary"}
                className="font-mono"
            >
                {isComplete ? "Close Viewer" : "Processing..."}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EventRow({ event, index }: { event: any; index: number }) {
    if (event.type === 'log') {
        return (
            <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-3 text-sm font-mono text-zinc-400 pl-2 border-l-2 border-zinc-800"
            >
                <span className="text-zinc-600">[{String(index).padStart(3, '0')}]</span>
                <span>{event.message}</span>
            </motion.div>
        );
    }

    if (event.type === 'chunk_created') {
        return (
            <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="ml-8 border border-zinc-800 bg-zinc-900/50 rounded-lg p-3 text-xs"
            >
                 <div className="flex items-center gap-2 mb-2 text-blue-400 font-mono text-[10px] uppercase tracking-wider">
                    <Split size={12} />
                    Chunk Created
                 </div>
                 <div className="font-mono text-zinc-300 leading-relaxed opacity-90 line-clamp-3 hover:line-clamp-none transition-all cursor-crosshair">
                    {event.content}
                 </div>
            </motion.div>
        );
    }
    
    // Status updates
    if (event.status === 'progress' && event.message) {
         return (
            <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-3 text-sm font-mono text-blue-400 pl-2 border-l-2 border-blue-500/50 bg-blue-500/5 p-1 rounded-r"
            >
                <span className="text-blue-700">[{String(index).padStart(3, '0')}]</span>
                <span className="font-bold">&gt; {event.message}</span>
            </motion.div>
        );
    }

    return null;
}
