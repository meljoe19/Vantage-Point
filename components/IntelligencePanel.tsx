
import React, { useState, useEffect } from 'react';
import { School, AppMode, AIIntelligenceReport, SchoolStatus } from '../types';
import { generateSchoolIntelligence, generateOutreachBrief, sendEmailBrief, updateCRMStatus } from '../services/geminiService';

interface IntelligencePanelProps {
  school: School | null;
  mode: AppMode;
  onClose: () => void;
  onUpdateSchool: (school: School) => void;
  onAddToManaged: (school: School) => void;
  onNotify: (msg: string) => void;
}

export const IntelligencePanel: React.FC<IntelligencePanelProps> = ({ school, mode, onClose, onUpdateSchool, onAddToManaged, onNotify }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [isUpdatingCRM, setIsUpdatingCRM] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('vantage_user_email') || '');
  
  const [activeTab, setActiveTab] = useState<'insights' | 'outreach'>('insights');

  // Trigger AI research only when a specific pin is selected (no bulk load)
  useEffect(() => {
    if (school && !school.aiReport && !isGenerating && !school.isExternal) {
      handleGenerateAI();
    }
  }, [school?.id]);

  if (!school) return null;

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const report = await generateSchoolIntelligence(school);
      onUpdateSchool({ ...school, aiReport: report });
    } catch (err) {
      setError("Strategic engine synchronization failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateOutreach = async () => {
    setIsGeneratingOutreach(true);
    setError(null);
    try {
      const brief = await generateOutreachBrief(school);
      if (school.aiReport || school.isExternal) {
        onUpdateSchool({
          ...school,
          aiReport: { 
            ...(school.aiReport || { summary: '', marketPosition: '', recentNews: [], strategicAdvice: '', sources: [] }), 
            storyBrandProposal: brief 
          }
        });
      }
    } catch (err) {
      setError("Outreach brief generation failed.");
    } finally {
      setIsGeneratingOutreach(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!aiReport?.storyBrandProposal) return;
    
    try {
      // Copy formatted text
      await navigator.clipboard.writeText(aiReport.storyBrandProposal);
      
      setIsUpdatingCRM(true);
      const update = await updateCRMStatus(school);
      onUpdateSchool({
        ...school,
        successTracker: update.successTracker,
        lastActionDate: update.lastActionDate
      });
      setIsUpdatingCRM(false);
      onNotify("Proposal copied to clipboard and logged to Sheet.");
    } catch (err) {
      console.error("Clipboard copy failed", err);
      onNotify("Copy to clipboard failed.");
    }
  };

  const handleSendEmail = async () => {
    if (!aiReport?.storyBrandProposal) return;
    
    let email = userEmail;
    if (!email) {
      const promptEmail = window.prompt("Where should we send this brief?", "consultant@slaterstrategies.com");
      if (promptEmail) {
        email = promptEmail;
        setUserEmail(email);
        localStorage.setItem('vantage_user_email', email);
      } else return;
    }

    setIsEmailing(true);
    try {
      await sendEmailBrief(school, aiReport.storyBrandProposal, email);
      const update = await updateCRMStatus(school);
      onUpdateSchool({
        ...school,
        successTracker: update.successTracker,
        lastActionDate: update.lastActionDate
      });
      onNotify("Brief sent and logged to Sheet.");
    } catch (err) {
      setError("Email delivery failed.");
    } finally {
      setIsEmailing(false);
    }
  };

  const { enriched, aiReport } = school;
  const campusViewImage = school.campusImage || `https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=800&h=450`;

  const renderFormattedText = (text: string) => {
    const parts = text.split(':');
    if (parts.length > 1) {
      return (
        <>
          <span className="font-bold text-[#002147] block mb-1">{parts[0].trim()}</span>
          <span className="text-slate-600">{parts.slice(1).join(':').trim()}</span>
        </>
      );
    }
    return text;
  };

  return (
    <div className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-white border-l border-slate-200 shadow-2xl z-[2001] flex flex-col transform transition-transform duration-500 ease-out">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
        <div className="flex flex-col">
          <h2 className="text-lg font-extrabold text-[#002147] uppercase tracking-tighter flex items-center gap-2">
            School <span className="text-[#F9A825]">Success</span> AI
          </h2>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Strategy Terminal v4.8</span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-slate-900">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Hero Image - Campus View */}
      <div className="px-6 pt-6">
        <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm relative aspect-[21/10] bg-slate-50">
          <img src={campusViewImage} className="w-full h-full object-cover" alt="Campus View" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent"></div>
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-xl font-black text-[#002147] uppercase tracking-tight leading-tight">{school.name}</h1>
            <p className="text-[10px] text-slate-600 font-bold truncate mt-0.5 uppercase tracking-wider">{enriched?.address}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-6 mt-6 border-b border-slate-100">
        <button onClick={() => setActiveTab('insights')} className={`flex-1 pb-4 text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === 'insights' ? 'text-[#002147] border-b-2 border-[#002147]' : 'text-slate-400 hover:text-slate-600'}`}>
          Intelligence
        </button>
        <button onClick={() => setActiveTab('outreach')} className={`flex-1 pb-4 text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === 'outreach' ? 'text-[#002147] border-b-2 border-[#002147]' : 'text-slate-400 hover:text-slate-600'}`}>
          Direct Outreach
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-white">
        {activeTab === 'insights' && (
          <section className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {school.isExternal && (
              <button 
                onClick={() => onAddToManaged(school)}
                className="w-full py-4 bg-[#002147] hover:bg-slate-800 text-white rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-900/10 border border-slate-900"
              >
                + Add to Managed CRM
              </button>
            )}

            {/* Researching... Indicator */}
            {isGenerating && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-[#002147] rounded-full animate-spin"></div>
                <div className="text-center px-4">
                  <p className="text-[11px] font-bold text-[#002147] uppercase tracking-[0.2em]">School Success AI is performing a strategic audit for {school.name}...</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && !isGenerating && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
                {error}
                <button onClick={handleGenerateAI} className="block mt-2 font-bold text-[#002147] underline uppercase tracking-widest">Retry Research</button>
              </div>
            )}

            {/* AI Results */}
            {aiReport && !isGenerating && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-[#002147] uppercase tracking-widest">Executive Audit</h3>
                  <div className="text-sm text-slate-600 leading-relaxed bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                    {aiReport.summary}
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#F9A825] rounded-lg flex items-center justify-center shadow-md">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                    </div>
                    <h3 className="text-[11px] font-black text-[#002147] uppercase tracking-[0.2em]">Strategic Growth Levers</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {aiReport.strategicAdvice.split(/\d\./).filter(v => v.trim()).map((lever, i) => (
                      <div key={i} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 hover:border-[#F9A825] transition-all shadow-sm">
                        <div className="text-sm leading-relaxed">
                          {renderFormattedText(lever.trim())}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'outreach' && (
          <section className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.1em] text-[#002147]">Personalized Executive Brief</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">StoryBrand Growth Engine</p>
                </div>
              </div>

              {!aiReport?.storyBrandProposal && !isGeneratingOutreach && (
                <button onClick={handleGenerateOutreach} className="w-full py-4 bg-[#002147] hover:bg-slate-800 text-white rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all">
                  Draft Personalized Brief
                </button>
              )}

              {isGeneratingOutreach && (
                <div className="flex flex-col items-center py-10">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-[#F9A825] rounded-full animate-spin mb-4"></div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center px-4">School Success AI is drafting your growth plan for {school.name}...</span>
                </div>
              )}

              {aiReport?.storyBrandProposal && (
                <div className="space-y-6">
                  {/* Clean Email Composition Display */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 max-h-[500px] overflow-y-auto custom-scrollbar shadow-inner text-sm text-slate-600 leading-relaxed font-sans">
                    <div className="whitespace-pre-wrap">
                      {aiReport.storyBrandProposal}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={handleCopyToClipboard} 
                      disabled={isUpdatingCRM}
                      className="w-full py-5 bg-[#002147] hover:bg-slate-800 disabled:bg-slate-200 text-white rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      {isUpdatingCRM ? "Updating Strategy Terminal..." : "Copy Strategic Brief to Clipboard"}
                    </button>
                    
                    <button 
                      onClick={handleSendEmail} 
                      disabled={isEmailing} 
                      className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                    >
                      {isEmailing ? "Transmitting..." : "Direct Send to Consultant"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
