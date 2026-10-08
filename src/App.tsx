/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { AnalyzingView } from './components/AnalyzingView';
import { DashboardOverview } from './components/DashboardOverview';
import { ExecutiveSummaryView } from './components/ExecutiveSummaryView';
import { SeoAuditView } from './components/SeoAuditView';
import { KeywordsView } from './components/KeywordsView';
import { CompetitorsView } from './components/CompetitorsView';
import { OpportunitiesView } from './components/OpportunitiesView';
import { ContentGeneratorView } from './components/ContentGeneratorView';
import { ActionPlanView } from './components/ActionPlanView';
import { EvolutionView } from './components/EvolutionView';
import { MonthlyReportView } from './components/MonthlyReportView';
import { AdminView } from './components/AdminView';
import { AiAssistantModal } from './components/AiAssistantModal';
import { NewBusinessModal } from './components/NewBusinessModal';
import { DemoNotice } from './components/DemoNotice';
import { storageService } from './services/storageService';
import {
  ActiveTab,
  Business,
  ExecutiveIssue,
  SeoAuditItem,
  KeywordItem,
  Competitor,
  Opportunity,
  ActionTask,
  MonthlyEvolution,
  TaskStatus,
  ContentGenerationRequest,
  SeoAuditResult,
} from './types';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('landing');
  const [businesses, setBusinesses] = useState<Business[]>(() => storageService.getBusinesses());
  const [activeBusinessId, setActiveBusinessId] = useState<string>(() => storageService.getActiveBusinessId());

  // Pending scan URL
  const [analyzingUrl, setAnalyzingUrl] = useState<string>('');

  // AI Assistant Drawer state
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState<string>('');

  // Content Generator pre-fill params
  const [contentGenParams, setContentGenParams] = useState<Partial<ContentGenerationRequest> | undefined>();

  // New Business Modal
  const [newBizModalOpen, setNewBizModalOpen] = useState(false);

  // Active business entity
  const activeBusiness =
    businesses.find((b) => b.id === activeBusinessId) || businesses[0];

  // Specific data for the active business
  const issues = storageService.getIssues(activeBusiness.id);
  const seoItems = storageService.getSeoAudit(activeBusiness.id);
  const seoAuditMeta = storageService.getSeoAuditMeta(activeBusiness.id);
  const keywords = storageService.getKeywords(activeBusiness.id);
  const competitors = storageService.getCompetitors(activeBusiness.id);
  const opportunities = storageService.getOpportunities(activeBusiness.id);
  const [actionTasks, setActionTasks] = useState<ActionTask[]>(() =>
    storageService.getActionTasks(activeBusiness.id)
  );
  const evolution = storageService.getEvolution(activeBusiness.id);

  // Keep action tasks synced when activeBusiness changes
  useEffect(() => {
    setActionTasks(storageService.getActionTasks(activeBusiness.id));
  }, [activeBusiness.id]);

  // Handlers
  const handleSelectBusiness = (bizId: string) => {
    setActiveBusinessId(bizId);
    storageService.setActiveBusinessId(bizId);
  };

  const handleStartAnalysis = (url: string, name?: string, category?: string, city?: string) => {
    setAnalyzingUrl(url);
    setActiveTab('analyzing');
  };

  const handleAnalysisComplete = (auditResult: SeoAuditResult) => {
    // Match existing businesses by normalized hostname to avoid duplicates.
    const getHostname = (value: string) => {
      try {
        const normalized = value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`;
        return new URL(normalized).hostname.replace(/^www\./, '').toLowerCase();
      } catch {
        return value.toLowerCase();
      }
    };
    const analyzedHost = getHostname(analyzingUrl);
    const existing = businesses.find((b) => getHostname(b.url) === analyzedHost);
    let targetBusinessId: string;
    if (existing) {
      targetBusinessId = existing.id;
      handleSelectBusiness(existing.id);
    } else {
      let deducedName = 'Negocio Analizado';
      try {
        const u = new URL(analyzingUrl.startsWith('http') ? analyzingUrl : `https://${analyzingUrl}`);
        const host = u.hostname.replace('www.', '').split('.')[0];
        deducedName = host.charAt(0).toUpperCase() + host.slice(1);
      } catch {
        deducedName = 'Mi Negocio';
      }

      const created = storageService.addBusiness({
        url: analyzingUrl,
        name: deducedName,
        category: 'Pendiente de definir',
        city: 'Pendiente de definir',
        country: 'Argentina',
      });
      setBusinesses(storageService.getBusinesses());
      handleSelectBusiness(created.id);
      targetBusinessId = created.id;
    }

    storageService.saveSeoAudit(targetBusinessId!, auditResult.items, {
      requestedUrl: auditResult.requestedUrl,
      finalUrl: auditResult.finalUrl,
      fetchedAt: auditResult.fetchedAt,
      httpStatus: auditResult.httpStatus,
      responseTimeMs: auditResult.responseTimeMs,
      pageSpeed: auditResult.pageSpeed || null,
      pageSpeedError: auditResult.pageSpeedError || null,
    });

    const realIssues = storageService.buildIssuesFromSeoAudit(targetBusinessId!, auditResult.items);
    storageService.saveIssues(targetBusinessId!, realIssues);
    storageService.updateProblemCounts(targetBusinessId!, realIssues);

    const realTasks = storageService.buildActionTasksFromSeoAudit(targetBusinessId!, auditResult.items);
    storageService.saveActionTasks(targetBusinessId!, realTasks);

    const seoScore = storageService.calculateSeoScore(auditResult.items);
    const pageSpeedScore = auditResult.pageSpeed?.performanceScore ?? null;
    if (seoScore !== null || pageSpeedScore !== null) {
      const currentBusiness = storageService.getBusinesses().find((business) => business.id === targetBusinessId!);
      const nextSeo = seoScore ?? currentBusiness?.scores.seo ?? 0;
      const nextWeb = pageSpeedScore ?? currentBusiness?.scores.web ?? 0;
      const verifiedValues = [seoScore, pageSpeedScore].filter((value): value is number => value !== null);
      const overall = verifiedValues.length
        ? Math.round(verifiedValues.reduce((sum, value) => sum + value, 0) / verifiedValues.length)
        : currentBusiness?.scores.overall ?? 0;

      storageService.updateBusinessScores(
        targetBusinessId!,
        {
          seo: nextSeo,
          web: nextWeb,
          overall,
        },
        {
          seo: seoScore !== null ? 'real' : 'demo',
          web: pageSpeedScore !== null ? 'real' : 'demo',
          overall: verifiedValues.length ? 'partial' : 'demo',
        }
      );
      setBusinesses(storageService.getBusinesses());
    }

    setBusinesses(storageService.getBusinesses());
    setActionTasks(storageService.getActionTasks(targetBusinessId!));
    setActiveTab('seo');
  };

  const handleSelectPreset = (presetId: string) => {
    handleSelectBusiness(presetId);
    setActiveTab('dashboard');
  };

  const handleAddNewBusiness = (biz: { name: string; url: string; category: string; city: string; country: string }) => {
    const created = storageService.addBusiness(biz);
    setBusinesses(storageService.getBusinesses());
    handleSelectBusiness(created.id);
    setAnalyzingUrl(biz.url);
    setActiveTab('analyzing');
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    const updated = storageService.updateTaskStatus(activeBusiness.id, taskId, newStatus);
    setActionTasks(updated);
  };

  const handleSelectOpportunityForAI = (opp: Opportunity) => {
    setContentGenParams({
      contentType: opp.contentParams.contentType,
      topic: opp.contentParams.topic,
      keyword: opp.contentParams.keyword,
      city: opp.contentParams.city,
      businessType: opp.contentParams.businessType,
      goal: opp.contentParams.goal,
    });
    setActiveTab('content-generator');
  };

  const handleOpenAssistantWithPrompt = (prompt: string) => {
    setAssistantInitialPrompt(prompt);
    setAssistantOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navbar (displayed on all screens; has link to landing) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeBusiness={activeBusiness}
        businesses={businesses}
        onSelectBusiness={handleSelectBusiness}
        onOpenNewBusinessModal={() => setNewBizModalOpen(true)}
        onOpenAssistant={() => {
          setAssistantInitialPrompt('');
          setAssistantOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'landing' && (
          <LandingPage
            onAnalyze={handleStartAnalysis}
            onSelectPreset={handleSelectPreset}
          />
        )}

        {activeTab === 'analyzing' && (
          <AnalyzingView
            url={analyzingUrl || activeBusiness.url}
            onComplete={handleAnalysisComplete}
            onCancel={() => setActiveTab('landing')}
          />
        )}

        {/* Views within the Business Dashboard */}
        {activeTab !== 'landing' && activeTab !== 'analyzing' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
            <DemoNotice />
            {activeTab === 'dashboard' && (
              <DashboardOverview
                business={activeBusiness}
                issues={issues}
                setActiveTab={setActiveTab}
                onOpenAssistant={() => {
                  setAssistantInitialPrompt('¿Qué debería mejorar primero en mi negocio?');
                  setAssistantOpen(true);
                }}
                onGenerateOpportunity={(oppId) => {
                  const opp = opportunities.find((o) => o.id === oppId) || opportunities[0];
                  handleSelectOpportunityForAI(opp);
                }}
              />
            )}

            {activeTab === 'executive-summary' && (
              <ExecutiveSummaryView
                business={activeBusiness}
                issues={issues}
                setActiveTab={setActiveTab}
                onOpenAssistant={() => {
                  setAssistantInitialPrompt('Explicame el problema más importante que tiene mi negocio.');
                  setAssistantOpen(true);
                }}
              />
            )}

            {activeTab === 'seo' && (
              <SeoAuditView
                business={activeBusiness}
                items={seoItems}
                auditMeta={seoAuditMeta}
                setActiveTab={setActiveTab}
                onOpenAssistant={() => {
                  setAssistantInitialPrompt('¿Por qué es importante tener las imágenes con texto ALT y cómo afecta mis reservas?');
                  setAssistantOpen(true);
                }}
                onReanalyze={() => {
                  setAnalyzingUrl(activeBusiness.url);
                  setActiveTab('analyzing');
                }}
              />
            )}

            {activeTab === 'keywords' && (
              <KeywordsView
                business={activeBusiness}
                keywords={keywords}
                setActiveTab={setActiveTab}
                onOpenAssistant={() => {
                  setAssistantInitialPrompt('¿Cuáles son las mejores palabras clave para posicionar mi negocio en mi ciudad?');
                  setAssistantOpen(true);
                }}
              />
            )}

            {activeTab === 'competitors' && (
              <CompetitorsView
                business={activeBusiness}
                competitors={competitors}
                setActiveTab={setActiveTab}
                onOpenAssistant={() => {
                  setAssistantInitialPrompt('¿Por qué mi competencia aparece antes que yo en Google y cómo los supero?');
                  setAssistantOpen(true);
                }}
              />
            )}

            {activeTab === 'opportunities' && (
              <OpportunitiesView
                business={activeBusiness}
                opportunities={opportunities}
                setActiveTab={setActiveTab}
                onSelectOpportunityForAI={handleSelectOpportunityForAI}
              />
            )}

            {activeTab === 'content-generator' && (
              <ContentGeneratorView
                business={activeBusiness}
                initialParams={contentGenParams}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'action-plan' && (
              <ActionPlanView
                business={activeBusiness}
                tasks={actionTasks}
                onUpdateStatus={handleUpdateTaskStatus}
                setActiveTab={setActiveTab}
                onOpenAssistantWithPrompt={handleOpenAssistantWithPrompt}
              />
            )}

            {activeTab === 'evolution' && (
              <EvolutionView
                business={activeBusiness}
                evolution={evolution}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'monthly-report' && (
              <MonthlyReportView
                business={activeBusiness}
                evolution={evolution}
                issues={issues}
              />
            )}

            {activeTab === 'admin' && (
              <AdminView
                businesses={businesses}
                setActiveTab={setActiveTab}
                onSelectBusiness={handleSelectBusiness}
              />
            )}
          </div>
        )}
      </main>

      {/* Floating AI Assistant Trigger Button (Bottom Right) */}
      {activeTab !== 'landing' && (
        <button
          onClick={() => {
            setAssistantInitialPrompt('');
            setAssistantOpen(true);
          }}
          className="no-print fixed bottom-6 right-6 z-40 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl hover:shadow-indigo-300 transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-wider cursor-pointer group hover:scale-105 active:scale-95"
          aria-label="Abrir asistente de negocio"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span className="hidden sm:inline">Preguntar al Asistente IA</span>
          <span className="sm:hidden">IA</span>
        </button>
      )}

      {/* Visibility AI Assistant Chat Drawer */}
      <AiAssistantModal
        business={activeBusiness}
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        initialPrompt={assistantInitialPrompt}
      />

      {/* Add New Business Modal */}
      <NewBusinessModal
        isOpen={newBizModalOpen}
        onClose={() => setNewBizModalOpen(false)}
        onAdd={handleAddNewBusiness}
      />
    </div>
  );
}
