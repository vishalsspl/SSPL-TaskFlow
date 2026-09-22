import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useHeaderStore } from '@/store/headerStore';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { stripHtml } from '@/lib/utils';

import DocumentList from '@/components/documents/DocumentList';
import DocumentContainer from '@/components/documents/DocumentContainer';
import CreateDocumentModal from '@/components/documents/CreateDocumentModal';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import {
  FileText,
  FolderKanban,
  Search,
  ArrowLeft,
  ChevronRight,
  ChevronsUpDown,
  Check,
  Layers,
  Users,
  Calendar,
  Sparkles,
  ExternalLink,
  Plus,
  Table2,
  Clock,
  Loader2,
  FolderClosed,
} from 'lucide-react';

const STATUS_STYLES = {
  PLANNING: { bg: 'rgba(245,158,11,0.1)', text: '#F59E0B', border: '#F59E0B60' },
  ACTIVE: { bg: 'rgba(72,161,17,0.1)', text: '#48A111', border: '#48A11160' },
  ON_HOLD: { bg: 'rgba(0,163,255,0.1)', text: '#00A3FF', border: '#00A3FF60' },
  COMPLETED: { bg: 'rgba(72,161,17,0.15)', text: '#48A111', border: '#48A11180' },
  CANCELLED: { bg: 'rgba(239,68,68,0.1)', text: '#EF4444', border: '#EF444460' },
};

export default function Documents() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { setHeader } = useHeaderStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [docView, setDocView] = useState('list'); // 'list' | 'edit' | 'create'
  const [selectedDocId, setSelectedDocId] = useState(null);

  const projectIdFromUrl = searchParams.get('project');
  const docIdFromUrl = searchParams.get('doc');

  // Fetch all projects user has access to
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await api.get('/projects');
      const data = Array.isArray(res.data) ? res.data : (res.data?.projects || []);
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects for documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your projects',
        variant: 'destructive',
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  // Find the selected project based on URL or state
  const selectedProject = useMemo(() => {
    if (!projectIdFromUrl) return null;
    return projects.find((p) => p.id === projectIdFromUrl) || null;
  }, [projectIdFromUrl, projects]);

  // Sync doc from URL
  useEffect(() => {
    if (docIdFromUrl) {
      setSelectedDocId(docIdFromUrl);
      setDocView('edit');
    } else if (docView === 'edit' && !docIdFromUrl) {
      setSelectedDocId(null);
      setDocView('list');
    }
  }, [docIdFromUrl]);

  // Update header based on view
  useEffect(() => {
    if (!selectedProject) {
      setHeader(
        'Documents',
        'Select a project to access its documentation, wiki notes, and spreadsheets',
        false
      );
    } else {
      setHeader(
        'Documents',
        `Viewing documentation for ${selectedProject.name}`,
        false
      );
    }
  }, [selectedProject, setHeader]);

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter((project) => {
      const cleanDesc = stripHtml(project.description).toLowerCase();
      return (
        project.name?.toLowerCase().includes(query) ||
        cleanDesc.includes(query) ||
        project.category?.toLowerCase().includes(query)
      );
    });
  }, [projects, searchQuery]);

  const handleSelectProject = (project) => {
    setSearchParams({ project: project.id });
    setDocView('list');
    setSelectedDocId(null);
  };

  const handleBackToProjects = () => {
    setSearchParams({});
    setDocView('list');
    setSelectedDocId(null);
  };

  const handleSwitchProject = (newProjectId) => {
    setSearchParams({ project: newProjectId });
    setDocView('list');
    setSelectedDocId(null);
  };

  return (
    <div className="flex-1 w-full h-full p-4 sm:p-6 lg:p-8 flex flex-col space-y-6 overflow-y-auto">
      {/* ─── 1. PROJECT DOCUMENTS VIEW ─────────────────────────────────────── */}
      {selectedProject ? (
        <div className="space-y-6 flex-1 flex flex-col">
          {/* Breadcrumb & Project Navigator Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-card rounded-2xl border border-border/60 shadow-sm">
            <div className="flex items-center flex-wrap gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToProjects}
                className="rounded-xl font-bold text-xs gap-1.5 h-8 sm:h-9 hover:bg-secondary transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Projects</span>
              </Button>

              <span className="text-muted-foreground/40 font-light hidden sm:inline">/</span>

              {/* Project Switcher Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 sm:h-9 px-3 gap-2 font-bold text-xs sm:text-sm text-foreground hover:bg-secondary/60 rounded-xl max-w-[260px] truncate flex items-center"
                  >
                    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <FolderKanban className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="truncate">{selectedProject.name}</span>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground ml-1 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto rounded-xl">
                  <DropdownMenuLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Switch Project
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {projects.map((p) => {
                    const isCurrent = p.id === selectedProject.id;
                    return (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => handleSwitchProject(p.id)}
                        className={`cursor-pointer gap-2 font-medium text-xs py-2 ${
                          isCurrent ? 'bg-primary/10 text-primary font-bold' : ''
                        }`}
                      >
                        <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate flex-1">{p.name}</span>
                        {isCurrent && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Badges */}
              {selectedProject.status && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider hidden md:inline-flex"
                  style={{
                    backgroundColor: STATUS_STYLES[selectedProject.status]?.bg || 'rgba(0,0,0,0.05)',
                    color: STATUS_STYLES[selectedProject.status]?.text || '#666',
                    border: `1px solid ${STATUS_STYLES[selectedProject.status]?.border || 'transparent'}`,
                  }}
                >
                  {selectedProject.status.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Link to full project page */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="rounded-xl font-bold text-xs gap-1.5 h-8 hover:bg-secondary"
              >
                <Link to={`/projects/${selectedProject.id}`}>
                  <span>Project Overview</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Documents Content */}
          <div className="flex-1 min-h-[500px]">
            {docView === 'list' && (
              <DocumentList
                projectId={selectedProject.id}
                projectManagers={selectedProject.managers}
                onNewDocument={() => {
                  setSelectedDocId(null);
                  setDocView('create');
                }}
                onEditDocument={(docId) => {
                  setSelectedDocId(docId);
                  setDocView('edit');
                  setSearchParams({ project: selectedProject.id, doc: docId });
                }}
                onViewDocument={(docId) => {
                  setSelectedDocId(docId);
                  setDocView('edit');
                  setSearchParams({ project: selectedProject.id, doc: docId });
                }}
              />
            )}

            {docView === 'edit' && (
              <DocumentContainer
                projectId={selectedProject.id}
                documentId={selectedDocId}
                projectManagers={selectedProject.managers}
                onBack={() => {
                  setDocView('list');
                  setSelectedDocId(null);
                  setSearchParams({ project: selectedProject.id });
                }}
              />
            )}

            <CreateDocumentModal
              open={docView === 'create'}
              onOpenChange={(open) => {
                if (!open) setDocView('list');
              }}
              projectId={selectedProject.id}
              onCreated={(doc) => {
                setSelectedDocId(doc.id);
                setDocView('edit');
                setSearchParams({ project: selectedProject.id, doc: doc.id });
              }}
            />
          </div>
        </div>
      ) : (
        /* ─── 2. PROJECT SELECTION LIST VIEW ──────────────────────────────── */
        <div className="space-y-6">
          {/* Top Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black Montserrat tracking-tight text-foreground flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Project Documents
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
                Choose a project below to access its wiki pages, requirements, and spreadsheets.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none z-10" />
              <Input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="!pl-9.5 sm:!pl-10 !pr-8 h-10 rounded-xl bg-card border-border/60 text-xs font-semibold focus-visible:ring-primary/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1 rounded-md hover:bg-secondary/60 transition-colors"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loadingProjects && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <Card key={idx} className="rounded-2xl border border-border/50 bg-card p-5 animate-pulse space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-secondary" />
                    <div className="w-16 h-5 rounded-full bg-secondary" />
                  </div>
                  <div className="space-y-2">
                    <div className="w-3/4 h-5 rounded-md bg-secondary" />
                    <div className="w-full h-3.5 rounded-md bg-secondary/60" />
                  </div>
                  <div className="pt-3 border-t border-border/40 flex justify-between items-center">
                    <div className="w-20 h-4 rounded-md bg-secondary" />
                    <div className="w-16 h-4 rounded-md bg-secondary" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Projects Grid */}
          {!loadingProjects && filteredProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((project) => {
                const statusStyle = STATUS_STYLES[project.status] || STATUS_STYLES.PLANNING;
                const docCount = project._count?.documents ?? 0;
                const managers = project.managers || (project.manager ? [project.manager] : []);

                return (
                  <Card
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    className="group rounded-2xl border border-border/60 hover:border-primary/50 bg-card hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
                  >
                    <CardContent className="p-5 sm:p-6 space-y-4">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground text-primary flex items-center justify-center transition-colors shadow-sm shrink-0">
                          <FolderKanban className="w-5 h-5" />
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {project.category && (
                            <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-wider py-0.5 px-2">
                              {project.category}
                            </Badge>
                          )}
                          {project.status && (
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                              style={{
                                backgroundColor: statusStyle.bg,
                                color: statusStyle.text,
                                border: `1px solid ${statusStyle.border}`,
                              }}
                            >
                              {project.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Project Title & Description */}
                      <div className="space-y-1.5">
                        <h3 className="font-black Montserrat text-base sm:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {project.name}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[2rem]">
                          {stripHtml(project.description) || 'No description provided for this project.'}
                        </p>
                      </div>

                      {/* Project Managers & Details */}
                      <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {managers.length > 0 ? (
                            <div className="flex items-center -space-x-2 overflow-hidden">
                              {managers.slice(0, 3).map((m, idx) => (
                                <Avatar key={m.id || idx} className="w-6 h-6 border-2 border-background ring-1 ring-border/20">
                                  <AvatarImage src={m.avatar} />
                                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                                    {(m.name || 'M').charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {managers.length > 3 && (
                                <span className="w-6 h-6 rounded-full bg-secondary text-[9px] font-bold flex items-center justify-center border-2 border-background">
                                  +{managers.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                              <Users className="w-3 h-3" /> Team
                            </span>
                          )}
                        </div>

                        {/* Documents Count Badge */}
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          <span>
                            {docCount} {docCount === 1 ? 'Doc' : 'Docs'}
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    {/* Card Footer Accent Bar */}
                    <div className="px-5 sm:px-6 py-3 bg-secondary/30 group-hover:bg-primary/10 border-t border-border/40 flex items-center justify-between transition-colors">
                      <span className="text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors">
                        Explore Documents
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loadingProjects && filteredProjects.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-3xl border border-dashed border-border/70 space-y-4 my-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <FolderClosed className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-lg font-bold text-foreground Montserrat">
                  {projects.length === 0 ? 'No Projects Found' : 'No Matching Projects'}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {projects.length === 0
                    ? 'You are not currently assigned to any projects. When you are assigned to a project, it will appear here.'
                    : `No projects match "${searchQuery}". Try clearing your search or filter.`}
                </p>
              </div>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="rounded-xl font-bold text-xs"
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
