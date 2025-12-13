'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ResearchProcess({ data }: { data?: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    
    if (!data) return null;
    
    // Unwrap the trace events
    // API sends: { type: "trace", content: { type: "hyde-generated", ... } }
    const traces = data
        .filter(d => d.type === "trace")
        .map(d => d.content);
    
    // Filter relevant events from the unwrapped traces
    const hyde = traces.find(d => d.type === 'hyde-generated');
    const evaluations = traces.filter(d => d.type === 'react-evaluation');
    
    if (evaluations.length === 0 && !hyde) return null;

    return (
        <div className="rounded-md border bg-muted/30 my-2 overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2 p-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
            >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <BrainCircuit size={14} className="text-blue-500" />
                Research Process ({evaluations.length} chunks analyzed)
            </button>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ height: 0 }} 
                        animate={{ height: 'auto' }} 
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 text-xs space-y-4 border-t">
                            {/* HyDE Section */}
                            {hyde && (
                                <div className="space-y-1">
                                    <div className="font-semibold text-blue-500 flex items-center gap-2">
                                        Agent Reasoning (HyDE)
                                    </div>
                                    <div className="bg-background p-2 rounded border italic text-muted-foreground">
                                        &quot;{hyde.content}&quot;
                                    </div>
                                </div>
                            )}
                            
                            {/* Evaluation Section */}
                            {evaluations.length > 0 && (
                                <div className="space-y-2">
                                    <div className="font-semibold text-muted-foreground">Evaluation Log</div>
                                    <div className="space-y-2">
                                        {evaluations.map((ev, i) => (
                                            <div key={i} className={`p-2 rounded border ${ev.isRelevant ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                                <div className="flex items-start gap-2">
                                                    {ev.isRelevant ? (
                                                        <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                                                    ) : (
                                                        <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                                    )}
                                                    <div className="flex-1 space-y-1">
                                                        <div className="font-medium">
                                                            {ev.isRelevant ? "Relevant Content Found" : "Discarded"}
                                                        </div>
                                                        <div className="text-muted-foreground text-[10px] font-mono leading-relaxed">
                                                            {ev.reasoning}
                                                        </div>
                                                        {ev.isRelevant && ev.quotes && ev.quotes.length > 0 && (
                                                            <div className="mt-2 bg-background p-1.5 rounded text-[10px] italic border-l-2 border-green-500">
                                                                &quot;{ev.quotes[0]}&quot;
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
