
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Cpu, Database, Split, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

type Step = {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: "pending" | "current" | "completed";
};

type Props = {
  isOpen: boolean;
  currentMessage: string;
  currentEvent: any;
  onClose: () => void;
};

export function RagProcessViewer({ isOpen, currentMessage, currentEvent, onClose }: Props) {
  // ... steps state ...
  const [steps, setSteps] = useState<Step[]>([
    {
      id: "extract",
      title: "PDF Extraction",
      description: "Parsing binary PDF data into raw text format.",
      icon: FileText,
      status: "pending",
    },
    {
        id: "save_raw",
        title: "Raw Storage",
        description: "Storing the original content for reference.",
        icon: Database,
        status: "pending",
    },
    {
      id: "embed",
      title: "Semantic Embedding & Chunking",
      description: "AI analysis: Splitting sentences, calculating similarity, and grouping by meaning (Semantic Chunking).",
      icon: Split,
      status: "pending",
    },
    {
      id: "index",
      title: "Vector Indexing",
      description: "Saving 1536-dimensional vectors to Postgres with pgvector.",
      icon: Cpu,
      status: "pending",
    },
  ]);

  const [serverStepIndex, setServerStepIndex] = useState(0);
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [comparisonData, setComparisonData] = useState<any>(null);

  // Map messages to step indices
  useEffect(() => {
    if (!currentMessage) return;
    
    let newServerStep = serverStepIndex;
    if (currentMessage.includes("Extracting")) newServerStep = 0;
    else if (currentMessage.includes("Saving raw")) newServerStep = 1;
    // Embed stage starts when we see similarity events or "Embedding sentences"
    else if (currentMessage.includes("Embedding") || currentEvent?.type === 'similarity') newServerStep = 2;
    else if (currentMessage.includes("Re-embedding")) newServerStep = 2; // Still stage 2 (end of it)
    else if (currentMessage.includes("Saving") && currentMessage.includes("embeddings")) newServerStep = 3;
    else if (currentMessage === "complete" || currentEvent?.status === 'complete') newServerStep = 4;

    if (newServerStep > serverStepIndex) {
        setServerStepIndex(newServerStep);
    }
  }, [currentMessage, currentEvent, serverStepIndex]);

  // Update comparison data for visualization
  useEffect(() => {
      if (currentEvent?.type === 'similarity') {
          setComparisonData(currentEvent);
      }
  }, [currentEvent]);

  // ... (keep displayedSteps, handleNext, etc.) ...
  const displayedSteps = steps.map((step, idx) => {
      if (idx < currentViewIndex) return { ...step, status: "completed" as const };
      if (idx === currentViewIndex) return { ...step, status: "current" as const };
      return { ...step, status: "pending" as const };
  });

  const handleNext = () => {
      if (currentViewIndex < 4) {
          setCurrentViewIndex(prev => prev + 1);
      }
  };

  const handleFinish = () => {
      onClose();
  };
  
  const progress = Math.max(5, (currentViewIndex / 4) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={() => { /* Prevent closing */ }}>
      <DialogContent className="max-w-6xl h-[800px] flex flex-col pointer-events-auto">
        {/* ... Header ... */}
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">RAG Ingestion Engine</DialogTitle>
          <DialogDescription>
             Visualizing the transformation from unstructured PDF to semantic knowledge.
          </DialogDescription>
          <div className="pt-4 flex items-center gap-4">
            <Progress value={progress} className="h-2 flex-1" />
            <span className="text-sm font-mono text-muted-foreground w-12 text-right">{Math.round(progress)}%</span>
          </div>
        </DialogHeader>

        <div className="flex-1 flex gap-8 py-6">
            <div className="w-1/3 space-y-6">
                {displayedSteps.map((step, idx) => (
                    <div key={step.id} className={`flex gap-4 items-start transition-opacity duration-500 ${step.status === 'pending' ? 'opacity-50' : 'opacity-100'}`}>
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                                ${step.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 
                                  step.status === 'current' ? 'border-blue-500 text-blue-500 animate-pulse' : 'border-zinc-700 text-zinc-700'}`}>
                                {step.status === 'completed' ? <CheckCircle2 size={16} /> : <step.icon size={16} />}
                            </div>
                            {idx !== steps.length - 1 && <div className="w-px h-12 bg-zinc-800 my-2" />}
                        </div>
                        <div>
                            <div className="font-semibold text-sm">{step.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">{step.description}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex-1 bg-zinc-950 rounded-xl border border-zinc-800 p-6 flex flex-col relative overflow-hidden">
                <div className="flex-1 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        {currentViewIndex < 4 && displayedSteps[currentViewIndex] && (
                            <StageVisual step={displayedSteps[currentViewIndex]} data={comparisonData} />
                        )}
                        {currentViewIndex === 4 && (
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 size={40} />
                                </div>
                                <h3 className="text-xl font-bold">Ingestion Complete</h3>
                                <p className="text-muted-foreground mt-2">Document is now ready for semantic search.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {/* ... Controls ... */}
                <div className="mt-8 pt-4 border-t border-zinc-800 flex justify-end">
                    {currentViewIndex < 4 ? (
                         <Button 
                            onClick={handleNext} 
                            disabled={currentViewIndex >= serverStepIndex}
                            className="w-full sm:w-auto"
                        >
                            {currentViewIndex >= serverStepIndex ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing ({serverStepIndex + 1}/5)...
                                </>
                            ) : (
                                <>
                                    Next Step
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
                            Finish & Close
                        </Button>
                    )}
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StageVisual({ step, data }: { step: Step, data: any }) {
    if (step.id === 'extract') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
            >
                <FileText size={48} className="mx-auto text-blue-500 mb-4 animate-bounce" />
                <div className="font-mono text-xs text-green-500 bg-zinc-900 p-4 rounded text-left w-64 h-32 overflow-hidden opacity-70">
                    %PDF-1.4<br/>
                    1 0 obj<br/>
                    &lt;&lt;/Type /Catalog /Pages 2 0 R&gt;&gt;<br/>
                    endobj<br/>
                     stream<br/>
                     BT /F1 12 Tf ...
                </div>
            </motion.div>
        )
    }
    if (step.id === 'save_raw') {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full"
            >
                <div className="relative">
                     <Database size={64} className="text-zinc-700" />
                     <motion.div 
                        initial={{ y: -40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute inset-0 flex items-center justify-center text-blue-500"
                     >
                        <FileText size={24} />
                     </motion.div>
                </div>
                <div className="mt-6 text-center space-y-2">
                    <div className="text-lg font-semibold">Archiving Original Document</div>
                    <div className="text-xs font-mono text-zinc-500 bg-zinc-900 p-2 rounded">
                        INSERT INTO resources (content) VALUES (...)
                    </div>
                </div>
            </motion.div>
        )
    }
    if (step.id === 'embed') {
         return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 w-full"
            >
                {data ? (
                     <div className="flex flex-col gap-4 w-full">
                         <div className="grid grid-cols-2 gap-4">
                             <div className="border p-2 rounded bg-zinc-900 text-xs h-24 overflow-y-auto">
                                <div className="font-bold text-muted-foreground mb-1">Sentence A</div>
                                {data.sentence1}
                             </div>
                             <div className="border p-2 rounded bg-zinc-900 text-xs h-24 overflow-y-auto">
                                <div className="font-bold text-muted-foreground mb-1">Sentence B</div>
                                {data.sentence2}
                             </div>
                         </div>
                         <div className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">Semantic Similarity</div>
                            <div className={`text-xl font-bold font-mono ${parseFloat(data.score) > 0.5 ? 'text-green-500' : 'text-red-500'}`}>
                                {data.score}
                            </div>
                            <div className="text-xs mt-1">
                                {parseFloat(data.score) > 0.5 ? "Merging into chunk" : "Starting new chunk"}
                            </div>
                         </div>
                     </div>
                ) : (
                    <div className="text-muted-foreground text-sm animate-pulse">Analyzing sentences...</div>
                )}
            </motion.div>
        )
    }
     if (step.id === 'index') {
         return (
             <motion.div
                 initial={{ opacity: 0, scale: 0.5 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0 }}
                 className="text-center"
             >
                 <Database size={64} className="mx-auto text-purple-500 mb-4" />
                 <div className="flex gap-2 justify-center">
                     <div className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
                     <div className="w-3 h-3 bg-green-500 rounded-full animate-ping delay-75" />
                     <div className="w-3 h-3 bg-green-500 rounded-full animate-ping delay-150" />
                 </div>
                 <p className="mt-4 text-xs font-mono text-muted-foreground">INSERT INTO embeddings...</p>
             </motion.div>
         )
     }
    return null;
}
