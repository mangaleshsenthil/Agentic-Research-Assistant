import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import {
  Loader2, BookOpen, Lightbulb, Cpu, FileSearch,
  ChevronRight, Sparkles, Clock, Brain, Layers,
  Download, Image as ImageIcon, X, FileText, CheckCircle,
  Hash, List, Code
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { uploadPaper, summarizeSection, generateWorkflow, downloadWorkflowFile, API_BASE_URL } from './services/api';

const App = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paperId, setPaperId] = useState(null);
  const [headings, setHeadings] = useState([]);
  const [fullSummary, setFullSummary] = useState('');
  const [researchIdeas, setResearchIdeas] = useState(null);
  const [selectedHeading, setSelectedHeading] = useState(null);
  const [sectionSummary, setSectionSummary] = useState('');
  const [sectionLoading, setSectionLoading] = useState(false);
  const [executionTime, setExecutionTime] = useState('');
  const [sectionCache, setSectionCache] = useState({});

  // Workflow Agent State
  const [selectedItem, setSelectedItem] = useState(null);
  const [workflowData, setWorkflowData] = useState(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);

  // Pagination for Research Discovery
  const [displayCounts, setDisplayCounts] = useState({ ideas: 3, models: 3, papers: 3 });
  const handleReadMore = (section) => setDisplayCounts(prev => ({ ...prev, [section]: prev[section] + 2 }));
  const handleShowLess = (section) => setDisplayCounts(prev => ({ ...prev, [section]: 3 }));

  // Shared Markdown Components with LaTeX support
  const MarkdownComponents = {
    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-white mb-6 pb-2 border-b border-slate-800 flex items-center gap-2" {...props} />,
    h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-blue-400 mt-8 mb-4 border-l-4 border-blue-500/50 pl-4" {...props} />,
    h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-white mt-6 mb-3 flex items-center gap-2" {...props} />,
    p: ({ node, ...props }) => <p className="text-slate-300 text-sm leading-7 mb-4" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300 text-sm" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-2 mb-4 text-slate-300 text-sm" {...props} />,
    li: ({ node, ...props }) => <li className="pl-2" {...props} />,
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const isPseudo = match && (match[1] === 'text' || match[1] === 'pseudo');
      
      if (!inline && isPseudo) {
        return (
          <div className="relative my-6 group">
            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-slate-800 rounded text-[10px] font-mono text-slate-400 border border-slate-700">Algorithmic Formulation</div>
            <div className="block bg-[#080808] p-6 rounded-xl border border-slate-800 text-emerald-300 text-xs font-mono overflow-x-auto shadow-2xl leading-relaxed">
              <ReactMarkdown 
                remarkPlugins={[remarkMath, remarkGfm]} 
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({node, ...p}) => <span {...p} />, // Avoid nested paragraphs
                }}
              >
                {String(children)}
              </ReactMarkdown>
            </div>
          </div>
        );
      }
      
      return inline ? (
        <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300 text-xs font-mono" {...props}>
          {children}
        </code>
      ) : (
        <div className="relative my-6 group">
          <code className="block bg-[#080808] p-6 rounded-xl border border-slate-800 text-emerald-300 text-xs font-mono overflow-x-auto shadow-2xl" {...props}>
            {children}
          </code>
        </div>
      );
    },
    strong: ({ node, ...props }) => <strong className="text-white font-bold" {...props} />,
    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-slate-700 pl-4 py-1 my-4 italic text-slate-400 bg-slate-800/20 rounded-r" {...props} />,
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setPaperId(null);
    setHeadings([]);
    setFullSummary('');
    setResearchIdeas(null);
    setSelectedHeading(null);
    setSectionSummary('');
    setSectionCache({});
    setDisplayCounts({ ideas: 3, models: 3, papers: 3 });
    try {
      const res = await uploadPaper(file);
      setPaperId(res.paper_id);
      setHeadings(res.headings || []);
      setFullSummary(res.full_summary || '');
      setResearchIdeas(res.research_ideas || null);
      setExecutionTime(res.execution_time || '');
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please check the backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleHeadingClick = async (heading) => {
    setSelectedHeading(heading);
    if (sectionCache[heading]) {
      setSectionSummary(sectionCache[heading]);
      return;
    }
    setSectionLoading(true);
    setSectionSummary('');
    try {
      const res = await summarizeSection(paperId, heading);
      setSectionSummary(res.summary || '');
      setSectionCache(prev => ({ ...prev, [heading]: res.summary }));
    } catch (err) {
      setSectionSummary("Failed to load section summary.");
    } finally {
      setSectionLoading(false);
    }
  };

  const showOverview = () => {
    setSelectedHeading(null);
    setSectionSummary('');
  };

  const handleItemClick = async (item, type) => {
    const itemName = type === 'idea' ? item.title : item.name;
    setSelectedItem({ ...item, type, name: itemName });
    setShowWorkflow(true);
    setWorkflowData(null);
    setWorkflowLoading(true);

    try {
      const res = await generateWorkflow(paperId, itemName, false);
      setWorkflowData(res);
    } catch (err) {
      console.error(err);
      alert("Failed to generate workflow. Try again later.");
    } finally {
      setWorkflowLoading(false);
    }
  };

  const closeWorkflow = () => {
    setShowWorkflow(false);
    setWorkflowData(null);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="border-b border-slate-800/80 bg-[#080808]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <Brain className="w-5 h-5 text-blue-400" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Agentic Research Assistant
                </h1>
              </div>
              <p className="text-slate-500 text-xs tracking-wide ml-12">
                Multi-Agent LLM Framework • Gemini + Groq
              </p>
            </div>
            {executionTime && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-emerald-300">{executionTime}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Upload Section ────────────────────────────────── */}
        <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl p-6">
          <FileUpload onFileSelect={(f) => setFile(f)} disabled={loading} />
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full mt-4 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl font-bold transition-all flex items-center justify-center text-sm tracking-wide border border-blue-500/30 disabled:border-slate-700"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2 w-4 h-4" />
                <span>Agents Processing...</span>
              </>
            ) : (
              <>
                <Sparkles className="mr-2 w-4 h-4" />
                <span>Analyze Paper</span>
              </>
            )}
          </button>
          {loading && (
            <div className="mt-3 flex items-center justify-center gap-6 text-[10px] text-slate-500 font-mono tracking-wider uppercase">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                Agent 1 · Gemini
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></span>
                Agent 2 · Gemini
              </span>
            </div>
          )}
        </div>

        {/* ── RESULTS ───────────────────────────────────────── */}
        {paperId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ═══════════════════════════════════════════════════
                SECTION 1 — SUMMARIZATION AGENT (Gemini)
            ═══════════════════════════════════════════════════ */}
            <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
              {/* Agent badge */}
              <div className="px-6 pt-5 pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                  </div>
                  <h2 className="text-sm font-bold text-white tracking-wide">Paper Analysis</h2>
                  <span className="ml-auto text-[9px] font-mono text-blue-400/60 bg-blue-400/5 px-2 py-0.5 rounded-full border border-blue-400/10">
                    AGENT 1 · GEMINI
                  </span>
                </div>

                {/* Heading pills scroll */}
                <div className="heading-scroll flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  <button
                    onClick={showOverview}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${!selectedHeading
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-300'
                      }`}
                  >
                    Overview
                  </button>
                  {headings.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => handleHeadingClick(h)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${selectedHeading === h
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-300'
                        }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary content */}
              <div className="p-6 flex-1 overflow-y-auto max-h-[600px]">
                {sectionLoading ? (
                  <div className="flex items-center justify-center py-20 text-slate-500">
                    <Loader2 className="animate-spin mr-2 w-5 h-5" />
                    <span className="text-sm">Summarizing section...</span>
                  </div>
                ) : selectedHeading ? (
                  <>
                    <h3 className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                      <ChevronRight className="w-3 h-3" />
                      {selectedHeading}
                    </h3>
                    <div className="bg-[#111] border border-slate-800 rounded-xl p-6 shadow-inner overflow-hidden">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={MarkdownComponents}
                      >
                        {sectionSummary}
                      </ReactMarkdown>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Layers className="w-3 h-3" />
                      Full Paper Summary
                    </h3>
                    <div className="bg-[#111] border border-slate-800 rounded-xl p-6 shadow-inner overflow-hidden">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={MarkdownComponents}
                      >
                        {fullSummary}
                      </ReactMarkdown>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                SECTION 2 — RESEARCH DISCOVERY AGENT (Groq)
            ═══════════════════════════════════════════════════ */}
            <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
              {/* Agent badge */}
              <div className="px-6 pt-5 pb-4 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <Lightbulb className="w-4 h-4 text-purple-400" />
                  </div>
                  <h2 className="text-sm font-bold text-white tracking-wide">Research Discovery</h2>
                  <span className="ml-auto text-[9px] font-mono text-purple-400/60 bg-purple-400/5 px-2 py-0.5 rounded-full border border-purple-400/10">
                    AGENT 2 · GEMINI
                  </span>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto max-h-[600px] space-y-6">
                {researchIdeas ? (
                  <>
                    {/* Future Ideas */}
                    {researchIdeas.future_ideas?.length > 0 && (
                      <div>
                        <h3 className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-widest mb-3">
                          <Lightbulb className="w-3.5 h-3.5" />
                          Future Research Ideas
                        </h3>
                        <div className="space-y-3">
                          {researchIdeas.future_ideas.slice(0, displayCounts.ideas).map((idea, i) => (
                            <div
                              key={i}
                              onClick={() => handleItemClick(idea, 'idea')}
                              className="bg-[#111] border border-slate-800 rounded-xl p-4 hover:border-amber-500/50 hover:bg-[#151515] transition-all cursor-pointer group"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">{idea.title}</h4>
                                <Sparkles className="w-3 h-3 text-amber-500/0 group-hover:text-amber-500/50 transition-all" />
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed mb-2">{idea.description}</p>
                              {idea.impact && (
                                <p className="text-[11px] text-amber-400/70 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> {idea.impact}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex gap-4 justify-center">
                          {researchIdeas.future_ideas.length > displayCounts.ideas && (
                            <button onClick={() => handleReadMore('ideas')} className="text-[11px] font-semibold text-amber-500 hover:text-amber-400 transition-colors uppercase tracking-wider">
                              Read More
                            </button>
                          )}
                          {displayCounts.ideas > 3 && (
                            <button onClick={() => handleShowLess('ideas')} className="text-[11px] font-semibold text-slate-500 hover:text-slate-400 transition-colors uppercase tracking-wider">
                              Show Less
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Alternative Models */}
                    {researchIdeas.alternative_models?.length > 0 && (
                      <div>
                        <h3 className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-widest mb-3">
                          <Cpu className="w-3.5 h-3.5" />
                          Alternative Models & Approaches
                        </h3>
                        <div className="space-y-3">
                          {researchIdeas.alternative_models.slice(0, displayCounts.models).map((model, i) => (
                            <div
                              key={i}
                              onClick={() => handleItemClick(model, 'model')}
                              className="bg-[#111] border border-slate-800 rounded-xl p-4 hover:border-cyan-500/50 hover:bg-[#151515] transition-all cursor-pointer group"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">{model.name}</h4>
                                <Cpu className="w-3 h-3 text-cyan-500/0 group-hover:text-cyan-500/50 transition-all" />
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed mb-2">{model.description}</p>
                              {model.advantage && (
                                <p className="text-[11px] text-cyan-400/70 flex items-center gap-1">
                                  <ChevronRight className="w-3 h-3" /> {model.advantage}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex gap-4 justify-center">
                          {researchIdeas.alternative_models.length > displayCounts.models && (
                            <button onClick={() => handleReadMore('models')} className="text-[11px] font-semibold text-cyan-500 hover:text-cyan-400 transition-colors uppercase tracking-wider">
                              Read More
                            </button>
                          )}
                          {displayCounts.models > 3 && (
                            <button onClick={() => handleShowLess('models')} className="text-[11px] font-semibold text-slate-500 hover:text-slate-400 transition-colors uppercase tracking-wider">
                              Show Less
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Related Papers */}
                    {researchIdeas.related_papers?.length > 0 && (
                      <div>
                        <h3 className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest mb-3">
                          <FileSearch className="w-3.5 h-3.5" />
                          Related Research Papers
                        </h3>
                        <div className="space-y-3">
                          {researchIdeas.related_papers.slice(0, displayCounts.papers).map((paper, i) => (
                            <div key={i} className="bg-[#111] border border-slate-800 rounded-xl p-4 hover:border-emerald-500/30 transition-colors">
                              <h4 className="text-sm font-semibold text-white mb-1">"{paper.title}"</h4>
                              {paper.authors && (
                                <p className="text-[11px] text-slate-500 mb-1">{paper.authors}</p>
                              )}
                              <p className="text-xs text-slate-400 leading-relaxed">{paper.relevance}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex gap-4 justify-center">
                          {researchIdeas.related_papers.length > displayCounts.papers && (
                            <button onClick={() => handleReadMore('papers')} className="text-[11px] font-semibold text-emerald-500 hover:text-emerald-400 transition-colors uppercase tracking-wider">
                              Read More
                            </button>
                          )}
                          {displayCounts.papers > 3 && (
                            <button onClick={() => handleShowLess('papers')} className="text-[11px] font-semibold text-slate-500 hover:text-slate-400 transition-colors uppercase tracking-wider">
                              Show Less
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                    <Lightbulb className="w-8 h-8 mb-3 opacity-30" />
                    <p className="text-sm">Research ideas will appear here</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── Workflow Overlay Modal ─────────────────────────── */}
      {showWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0c0c0c] border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#111]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">Project Workflow</h2>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Agent 3 · Project Architect</p>
                </div>
              </div>
              <button
                onClick={closeWorkflow}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gradient-to-b from-[#0c0c0c] to-[#050505]">
              {workflowLoading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                    <Brain className="w-5 h-5 text-emerald-300 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <p className="text-slate-400 text-sm animate-pulse">Architecting technical implementation plan...</p>
                </div>
              ) : workflowData ? (
                <>
                  {/* Action Buttons */}
                    <div className="flex flex-wrap gap-4 sticky top-0 z-10 bg-[#0c0c0c]/80 backdrop-blur-md py-2 -mx-2 px-2">
                      <button
                        onClick={() => downloadWorkflowFile(workflowData.workflow_id)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl font-bold text-xs hover:bg-slate-200 transition-all shadow-lg"
                      >
                        <Download className="w-4 h-4" /> Download Word Doc
                      </button>
                    </div>


                  {/* Project Summary Header */}
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
                    <Sparkles className="absolute top-4 right-4 w-12 h-12 text-emerald-500/10" />
                    <h3 className="text-xl font-bold text-white mb-2">{selectedItem.name}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                      Technical implementation strategy and structural workflow generated based on the selected {selectedItem.type}.
                    </p>
                  </div>

                  {/* Workflow Text Content */}
                  <div className="text-slate-300 leading-relaxed max-w-none">
                    <div className="bg-[#111] border border-slate-800 rounded-2xl p-8 shadow-inner overflow-hidden">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={MarkdownComponents}
                      >
                        {workflowData.workflow_text}
                      </ReactMarkdown>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-center bg-[#0c0c0c]">
              <p className="text-[10px] text-slate-500">© 2026 Agentic Research Assistant · AI-Generated Project Architecture</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;