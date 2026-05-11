import { useState, useEffect } from 'react';
import { useHeaderStore } from '@/store/headerStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { Github, CheckCircle2, XCircle, ExternalLink, RefreshCw, Unlink, GitCommit, ChevronRight, ArrowLeft, Clock, User, Loader2, FolderGit2, Link2, GitBranch, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import ConfirmDialog from '@/components/ConfirmDialog';

const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const Integrations = () => {
  const { setHeader } = useHeaderStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [commits, setCommits] = useState([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [linkedProjects, setLinkedProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectCommits, setProjectCommits] = useState([]);
  const [loadingProjectCommits, setLoadingProjectCommits] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [fetchingBranches, setFetchingBranches] = useState(false);

  // GitHub config state
  const [isConfigured, setIsConfigured] = useState(false);
  const [configData, setConfigData] = useState({ clientId: '', clientSecret: '', callbackUrl: '' });
  const [savingConfig, setSavingConfig] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);

  // Link modal state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [repoToLink, setRepoToLink] = useState(null);
  const [projectsToLink, setProjectsToLink] = useState([]);
  const [selectedProjectIdToLink, setSelectedProjectIdToLink] = useState('');
  const [linking, setLinking] = useState(false);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [projectToUnlinkId, setProjectToUnlinkId] = useState(null);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    setHeader("Integrations", "Connect third-party tools to enhance your workflow", false);
    fetchGitHubConfig();
  }, [setHeader]);

  const fetchGitHubConfig = async () => {
    try {
      const res = await api.get('/integrations/github/config');
      if (res.data.configured) {
        setIsConfigured(true);
        setConfigData(prev => ({ ...prev, clientId: res.data.clientId, callbackUrl: res.data.callbackUrl }));
        if (res.data.connected) {
          // Config exists and OAuth completed — fetch repos
          await checkConnection();
        } else {
          setLoading(false);
        }
      } else {
        setIsConfigured(false);
        setShowConfigForm(true);
        setLoading(false);
      }
    } catch (error) {
      setIsConfigured(false);
      setShowConfigForm(true);
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!configData.clientId || !configData.clientSecret || !configData.callbackUrl) {
      toast({ title: 'Validation Error', description: 'All three fields are required.', variant: 'destructive' });
      return;
    }
    setSavingConfig(true);
    try {
      await api.post('/integrations/github/config', configData);
      toast({ title: 'Saved', description: 'GitHub credentials saved successfully.' });
      setIsConfigured(true);
      setShowConfigForm(false);
    } catch (error) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to save credentials.', variant: 'destructive' });
    } finally {
      setSavingConfig(false);
    }
  };

  const checkConnection = async () => {
    try {
      const response = await api.get('/integrations/github/repos');
      if (response.data && Array.isArray(response.data)) {
        setIsConnected(true);
        setRepos(response.data);
        fetchLinkedProjects();
      }
    } catch (error) {
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };


  const fetchLinkedProjects = async () => {
    try {
      const response = await api.get('/integrations/github/linked-projects');
      setLinkedProjects(response.data || []);
    } catch (error) {
      console.error('Failed to fetch linked projects:', error);
    }
  };

  const handleConnect = async () => {
    try {
      const response = await api.get('/integrations/github/auth');
      const { url } = response.data;
      
      const width = 600;
      const height = 700;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;
      
      const popup = window.open(
        url,
        'GitHub Authorization',
        `width=${width},height=${height},top=${top},left=${left}`
      );

      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          checkConnection();
        }
      }, 1000);
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to initiate GitHub authorization.",
        variant: "destructive"
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.delete('/integrations/github');
      setIsConnected(false);
      setRepos([]);
      setSelectedRepo(null);
      setCommits([]);
      setLinkedProjects([]);
      setSelectedProject(null);
      setProjectCommits([]);
      setShowDisconnectDialog(false);
      toast({
        title: "Disconnected",
        description: "GitHub has been disconnected from your organization."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect GitHub.",
        variant: "destructive"
      });
    }
  };

  const openLinkModal = async (repo) => {
    setRepoToLink(repo);
    setSelectedProjectIdToLink('');
    setIsLinkModalOpen(true);
    try {
      const response = await api.get('/projects');
      const projectsData = Array.isArray(response.data) ? response.data : response.data.data || [];
      setProjectsToLink(projectsData);
    } catch (error) {
      console.error('Failed to fetch projects', error);
      toast({ title: 'Error', description: 'Failed to fetch projects', variant: 'destructive' });
    }
  };

  const submitLink = async () => {
    if (!selectedProjectIdToLink) {
      toast({ title: 'Error', description: 'Please select a project', variant: 'destructive' });
      return;
    }
    setLinking(true);
    try {
      await api.post(`/integrations/github/link/${selectedProjectIdToLink}`, { repoFullName: repoToLink.full_name });
      toast({ title: 'Success', description: 'Repository linked successfully' });
      setIsLinkModalOpen(false);
      fetchLinkedProjects();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to link repository', variant: 'destructive' });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkProject = async (projectId) => {
    try {
      await api.post(`/integrations/github/link/${projectId}`, { repoFullName: null });
      toast({ title: "Success", description: "Project unlinked successfully" });
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setProjectCommits([]);
      }
      setShowUnlinkDialog(false);
      fetchLinkedProjects();
    } catch (error) {
      toast({ title: "Error", description: "Failed to unlink project", variant: "destructive" });
    }
  };

  const handleRepoClick = async (repo) => {
    if (selectedRepo?.id === repo.id) {
      setSelectedRepo(null);
      setCommits([]);
      return;
    }

    setSelectedRepo(repo);
    setSelectedProject(null);
    setProjectCommits([]);
    setLoadingCommits(true);
    setCommits([]);
    setSelectedBranch('');

    try {
      const [owner, repoName] = repo.full_name.split('/');
      
      // Fetch branches first
      setFetchingBranches(true);
      try {
        const branchRes = await api.get(`/integrations/github/branches/${owner}/${repoName}`);
        setBranches(branchRes.data || []);
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      } finally {
        setFetchingBranches(false);
      }

      const response = await api.get(`/integrations/github/commits/${owner}/${repoName}`);
      setCommits(response.data);

      // Scroll to commits section
      setTimeout(() => {
        const commitsSection = document.getElementById('repo-commits-timeline');
        if (commitsSection) {
          commitsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {

      toast({
        title: "Error",
        description: "Failed to fetch commits for this repository.",
        variant: "destructive"
      });
    } finally {
      setLoadingCommits(false);
    }
  };

  const handleBranchChange = async (branchName) => {
    setSelectedBranch(branchName);
    const repoFullName = selectedRepo?.full_name || selectedProject?.githubRepo;
    if (!repoFullName) return;

    const [owner, repoName] = repoFullName.split('/');
    
    if (selectedRepo) {
      setLoadingCommits(true);
      try {
        const response = await api.get(`/integrations/github/commits/${owner}/${repoName}${branchName ? `?sha=${branchName}` : ''}`);
        setCommits(response.data);
      } catch (error) {
        toast({ title: "Error", description: "Failed to fetch commits for branch.", variant: "destructive" });
      } finally {
        setLoadingCommits(false);
      }
    } else if (selectedProject) {
      setLoadingProjectCommits(true);
      try {
        const response = await api.get(`/integrations/github/commits/${owner}/${repoName}${branchName ? `?sha=${branchName}` : ''}`);
        setProjectCommits(response.data);
      } catch (error) {
        toast({ title: "Error", description: "Failed to fetch commits for branch.", variant: "destructive" });
      } finally {
        setLoadingProjectCommits(false);
      }
    }
  };

  const handleProjectClick = async (project) => {
    if (selectedProject?.id === project.id) {
      setSelectedProject(null);
      setProjectCommits([]);
      return;
    }

    setSelectedProject(project);
    setSelectedRepo(null);
    setCommits([]);
    setLoadingProjectCommits(true);
    setProjectCommits([]);
    setSelectedBranch('');

    try {
      const [owner, repoName] = project.githubRepo.split('/');
      
      // Fetch branches first
      setFetchingBranches(true);
      try {
        const branchRes = await api.get(`/integrations/github/branches/${owner}/${repoName}`);
        setBranches(branchRes.data || []);
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      } finally {
        setFetchingBranches(false);
      }

      const response = await api.get(`/integrations/github/commits/${owner}/${repoName}`);
      setProjectCommits(response.data);

      // Scroll to commits section
      setTimeout(() => {
        const commitsSection = document.getElementById('repo-commits-timeline');
        if (commitsSection) {
          commitsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch commits for this project.",
        variant: "destructive"
      });
    } finally {
      setLoadingProjectCommits(false);
    }
  };

  // Render the commit timeline (shared between repo commits & project commits)
  const renderCommitTimeline = (commitList, isLoading, label, onClose) => (
    <div id="repo-commits-timeline" className="scroll-mt-6">
      <Card className="border-none shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-300">
      <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl shrink-0">
              <GitCommit className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg font-bold truncate">Recent Commits</CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-0.5 truncate text-[10px] sm:text-sm">
                <Github className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {branches.length > 0 && (
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden lg:inline">Branch:</span>
                <Select
                  value={selectedBranch || "default"}
                  onValueChange={(val) => handleBranchChange(val === "default" ? "" : val)}
                >
                  <SelectTrigger className="w-full sm:w-[160px] md:w-[180px] h-9 rounded-xl bg-background/50 border-border/50 hover:bg-accent/10 transition-all font-semibold text-xs sm:text-sm">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 bg-popover/95 backdrop-blur-md">
                    <SelectItem value="default" className="rounded-lg focus:bg-primary/10">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-3.5 h-3.5 opacity-50" />
                        <span>Default Branch</span>
                      </div>
                    </SelectItem>
                    {branches.map(b => (
                      <SelectItem key={b.name} value={b.name} className="rounded-lg focus:bg-primary/10">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-3.5 h-3.5 opacity-50" />
                          <span>{b.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/20 w-8 h-8 shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
            <p className="text-sm">Loading commits...</p>
          </div>
        ) : commitList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <GitCommit className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No commits found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {commitList.map((commit, index) => (
              <a
                key={commit.sha}
                href={commit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 hover:bg-accent/5 transition-colors group"
              >
                <div className="flex flex-col items-center pt-1 flex-shrink-0">
                  {commit.authorAvatar ? (
                    <img
                      src={commit.authorAvatar}
                      alt={commit.author}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-2 ring-background shadow-sm"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-background">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    </div>
                  )}
                  {index < commitList.length - 1 && (
                    <div className="w-px h-full bg-border/50 mt-2 min-h-[12px] sm:min-h-[16px]" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs sm:text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2 sm:line-clamp-none">
                    {commit.message.split('\n')[0]}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] sm:text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1 font-semibold text-foreground/70">
                      <User className="w-3 h-3" />
                      {commit.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(commit.date)}
                    </span>
                    <span className="font-mono text-primary/60 bg-primary/5 px-1 rounded group-hover:text-primary transition-colors">
                      {commit.sha.substring(0, 7)}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ─── GitHub Connection Card ─── */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-card to-secondary/10">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-7">
          <div className="space-y-1.5 w-full sm:w-auto">
            <CardTitle className="text-xl sm:text-2xl font-black flex items-center gap-2 Montserrat">
              <Github className="w-6 h-6 sm:w-8 sm:h-8" />
              GitHub Integration
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm leading-relaxed">
              Sync your repositories and track commit activity directly in TaskFlow.
            </CardDescription>
          </div>
          <Badge variant={isConnected ? "success" : "secondary"} className="h-6 sm:h-7 px-3 sm:px-4 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider">
            {isConnected ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <XCircle className="w-3.5 h-3.5" /> Not Connected
              </span>
            )}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isConnected ? (
            <div className="flex flex-col items-center py-8 text-center space-y-6">
              <div className="p-6 bg-primary/5 rounded-full ring-8 ring-primary/5 mb-2">
                <Github className="w-12 h-12 text-primary" />
              </div>

              {!isAdmin ? (
                <p className="text-sm text-muted-foreground italic">Ask your Admin to connect GitHub for the organization.</p>
              ) : !isConfigured || showConfigForm ? (
                /* ─── Step 1: Configure Credentials ─── */
                <div className="w-full max-w-lg space-y-4 text-left">
                  <div className="text-center mb-2">
                    <h3 className="text-lg font-bold">Configure GitHub OAuth App</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create an OAuth App at{' '}
                      <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        github.com/settings/developers
                      </a>{' '}
                      and paste the credentials below.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client ID</label>
                    <input
                      type="text"
                      value={configData.clientId}
                      onChange={(e) => setConfigData({ ...configData, clientId: e.target.value })}
                      placeholder="Ov23li..."
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Secret</label>
                    <input
                      type="password"
                      value={configData.clientSecret}
                      onChange={(e) => setConfigData({ ...configData, clientSecret: e.target.value })}
                      placeholder="••••••••••••••••"
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Callback URL</label>
                    <input
                      type="text"
                      value={configData.callbackUrl}
                      onChange={(e) => setConfigData({ ...configData, callbackUrl: e.target.value })}
                      placeholder="http://your-server/api/integrations/github/callback"
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="flex gap-2 justify-center pt-2">
                    {isConfigured && (
                      <Button variant="ghost" onClick={() => setShowConfigForm(false)} className="rounded-xl">Cancel</Button>
                    )}
                    <Button onClick={handleSaveConfig} disabled={savingConfig} className="rounded-xl px-8 shadow-lg shadow-primary/20">
                      {savingConfig ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Save Credentials
                    </Button>
                  </div>
                </div>
              ) : (
                /* ─── Step 2: Connect (credentials already saved) ─── */
                <div className="space-y-4">
                  <div className="max-w-md">
                    <h3 className="text-lg font-bold">Connect your GitHub account</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Credentials configured. Click below to authorize TaskFlow to access your GitHub repositories.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={() => setShowConfigForm(true)} className="rounded-xl text-xs">
                      Reconfigure
                    </Button>
                    <Button onClick={handleConnect} size="lg" className="rounded-xl px-8 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                      Connect GitHub
                    </Button>
                  </div>
                </div>
              )}
            </div>

          ) : (
            <div className="space-y-6">
              {/* ─── Available Repositories (Admin only) ─── */}
              {isAdmin && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <h3 className="text-[11px] sm:text-sm font-black text-muted-foreground uppercase tracking-widest Montserrat flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      Available Repositories ({repos.length})
                    </h3>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button variant="outline" size="sm" onClick={checkConnection} disabled={loading} className="flex-1 sm:flex-none h-8 sm:h-9 rounded-xl bg-secondary/50 border-border/50 text-[10px] sm:text-xs font-bold uppercase tracking-wider Montserrat">
                        <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setShowDisconnectDialog(true)} className="flex-1 sm:flex-none h-8 sm:h-9 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider Montserrat">
                        <Unlink className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-2" />
                        Disconnect
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {repos.map((repo) => {
                      const isAlreadyLinked = linkedProjects.some(p => p.githubRepo === repo.full_name);
                      return (
                        <div
                          key={repo.id}
                          onClick={() => handleRepoClick(repo)}
                          className={`relative p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer group ${
                            selectedRepo?.id === repo.id
                              ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/20'
                              : isAlreadyLinked 
                                ? 'bg-primary/5 border-primary/20 shadow-sm shadow-primary/5'
                                : 'bg-card/50 hover:bg-accent/10 border-border'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-xl shrink-0 ${isAlreadyLinked ? 'bg-primary/10' : 'bg-muted'}`}>
                              <Github className={`w-4 h-4 sm:w-5 sm:h-5 ${isAlreadyLinked ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="min-w-0 flex-1 pr-8">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-bold text-sm sm:text-base truncate Montserrat">{repo.name}</p>
                                {isAlreadyLinked && (
                                  <Badge variant="outline" className="h-4 text-[8px] sm:text-[9px] px-1.5 border-primary/30 text-primary bg-primary/5 uppercase tracking-tighter font-black">Linked</Badge>
                                )}
                              </div>
                              <p className="text-[10px] sm:text-xs text-muted-foreground truncate opacity-70 mt-0.5">{repo.full_name}</p>
                              
                              <div className="mt-3 flex items-center gap-3">
                                {selectedRepo?.id === repo.id ? (
                                  <Badge className="text-[9px] sm:text-[10px] bg-primary text-primary-foreground font-black uppercase tracking-widest py-0.5">
                                    <GitCommit className="w-2.5 h-2.5 mr-1" /> Viewing
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest py-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                    <GitCommit className="w-2.5 h-2.5 mr-1" /> View Commits
                                  </Badge>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 text-[10px] font-bold rounded-lg z-10 hover:bg-primary/10 hover:text-primary transition-colors border-primary/20"
                                  onClick={(e) => { e.stopPropagation(); openLinkModal(repo); }}
                                >
                                  <Link2 className="w-3 h-3 mr-1" /> Assign to Project
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2 hover:bg-primary/10 rounded-xl transition-all text-primary opacity-40 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ─── Linked Projects (All Roles) ─── */}
              {linkedProjects.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 flex-wrap">
                    <FolderGit2 className="w-4 h-4" />
                    {isAdmin ? 'Linked Projects' : 'Your Linked Projects'} ({linkedProjects.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {linkedProjects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => handleProjectClick(project)}
                        className={`relative p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer group ${
                          selectedProject?.id === project.id
                            ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/20'
                            : 'bg-card/50 hover:bg-accent/10 border-border'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${selectedProject?.id === project.id ? 'bg-primary/10' : 'bg-muted'}`}>
                            <FolderGit2 className={`w-4 h-4 sm:w-5 sm:h-5 ${selectedProject?.id === project.id ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm sm:text-base truncate Montserrat">{project.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Link2 className="w-3 h-3 text-muted-foreground/50" />
                              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{project.githubRepo}</p>
                            </div>
                            
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                              {isAdmin && project.manager && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-primary/5 border border-primary/10">
                                  <User className="w-2.5 h-2.5 text-primary" />
                                  <p className="text-[9px] font-black uppercase tracking-wider text-primary/80">
                                    {project.manager.name}
                                  </p>
                                </div>
                              )}
                              
                              {project.workloads && project.workloads.length > 0 && (
                                <div className="flex items-center" title={project.workloads.map(w => w.user.name).join(', ')}>
                                  {project.workloads.slice(0, 3).map((w, i) => (
                                    <div key={w.user.id} className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-2 ring-card bg-primary ${i > 0 ? '-ml-1.5' : ''}`}>
                                      {w.user.avatar ? (
                                        <img src={w.user.avatar} className="w-full h-full rounded-full object-cover" alt={w.user.name} />
                                      ) : (
                                        w.user.name.charAt(0).toUpperCase()
                                      )}
                                    </div>
                                  ))}
                                  {project.workloads.length > 3 && (
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-muted-foreground bg-secondary ring-2 ring-card -ml-1.5">
                                      +{project.workloads.length - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {selectedProject?.id === project.id ? (
                                <Badge className="text-[9px] sm:text-[10px] bg-primary text-primary-foreground font-black uppercase tracking-widest py-0.5">
                                  <GitCommit className="w-2.5 h-2.5 mr-1" /> Viewing
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 translate-x-[-4px] group-hover:translate-x-0">
                                  Track commits <ChevronRight className="w-3 h-3" />
                                </span>
                              )}
                              
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[9px] font-bold rounded-lg z-10 hover:bg-destructive/10 hover:text-destructive text-destructive transition-colors border-destructive/20 ml-auto"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProjectToUnlinkId(project.id);
                                    setShowUnlinkDialog(true);
                                  }}
                                >
                                  <Unlink className="w-2.5 h-2.5 mr-1" /> Unlink
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No linked projects message for non-admin */}
              {!isAdmin && linkedProjects.length === 0 && (
                <div className="flex flex-col items-center py-10 text-center space-y-3 text-muted-foreground">
                  <FolderGit2 className="w-10 h-10 opacity-30" />
                  <p className="text-sm">No projects linked to GitHub repositories yet.</p>
                  <p className="text-xs">Ask your Admin to link a repository to your projects.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Repo Commit Logs (Admin clicks a repo) ─── */}
      {selectedRepo && renderCommitTimeline(
        commits,
        loadingCommits,
        selectedRepo.full_name,
        () => { setSelectedRepo(null); setCommits([]); }
      )}

      {/* Project Commit Logs (Any role clicks a linked project) */}
      {selectedProject && renderCommitTimeline(
        projectCommits,
        loadingProjectCommits,
        `${selectedProject.name} → ${selectedProject.githubRepo}`,
        () => { setSelectedProject(null); setProjectCommits([]); }
      )}

      {/* Link Repository Dialog */}
      <ConfirmDialog
        open={showUnlinkDialog}
        onOpenChange={setShowUnlinkDialog}
        onConfirm={() => handleUnlinkProject(projectToUnlinkId)}
        title="Unlink Repository?"
        description="Are you sure you want to unlink this repository from the project? This will stop syncing commit activity."
        confirmText="Yes, Unlink"
      />

      <ConfirmDialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
        onConfirm={handleDisconnect}
        title="Disconnect GitHub?"
        description="Are you sure you want to disconnect your GitHub account? This will remove all repository links for the entire organization."
        confirmText="Yes, Disconnect"
      />

      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Assign Repository
            </DialogTitle>
            <DialogDescription>
              Select a project to assign the repository <strong>{repoToLink?.name}</strong> to. The project's manager will gain access to this repository's activity.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <SearchableSelect
              value={selectedProjectIdToLink}
              onChange={setSelectedProjectIdToLink}
              options={projectsToLink.map(p => ({
                label: `${p.name} ${p.manager ? `(Manager: ${p.manager.name})` : ''}`,
                value: p.id
              }))}
              placeholder="Search for a project..."
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsLinkModalOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={submitLink} disabled={linking} className="rounded-xl">
              {linking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Assign Repository
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Integrations;
