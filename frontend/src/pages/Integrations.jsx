import { useState, useEffect } from 'react';
import { useHeaderStore } from '@/store/headerStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { Github, CheckCircle2, XCircle, ExternalLink, RefreshCw, Unlink, GitCommit, ChevronRight, ArrowLeft, Clock, User, Loader2, FolderGit2, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';

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

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    setHeader("Integrations", "Connect third-party tools to enhance your workflow", false);
    checkConnection();
  }, [setHeader]);

  const checkConnection = async () => {
    try {
      const response = await api.get('/integrations/github/repos');
      if (response.data && Array.isArray(response.data)) {
        setIsConnected(true);
        setRepos(response.data);
        // Fetch linked projects for all roles
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

    try {
      const [owner, repoName] = repo.full_name.split('/');
      const response = await api.get(`/integrations/github/commits/${owner}/${repoName}`);
      setCommits(response.data);
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

    try {
      const [owner, repoName] = project.githubRepo.split('/');
      const response = await api.get(`/integrations/github/commits/${owner}/${repoName}`);
      setProjectCommits(response.data);
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
    <Card className="border-none shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-300">
      <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <GitCommit className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Recent Commits</CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-0.5">
                <Github className="w-3.5 h-3.5" />
                {label}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Close
          </Button>
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
                className="flex items-start gap-4 px-6 py-4 hover:bg-accent/5 transition-colors group"
              >
                <div className="flex flex-col items-center pt-1 flex-shrink-0">
                  {commit.authorAvatar ? (
                    <img
                      src={commit.authorAvatar}
                      alt={commit.author}
                      className="w-8 h-8 rounded-full ring-2 ring-background"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-background">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  {index < commitList.length - 1 && (
                    <div className="w-px h-full bg-border/50 mt-2 min-h-[16px]" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {commit.message.split('\n')[0]}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {commit.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(commit.date)}
                    </span>
                    <span className="font-mono text-primary/60 group-hover:text-primary transition-colors">
                      {commit.sha.substring(0, 7)}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ─── GitHub Connection Card ─── */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-card to-secondary/10">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-7">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Github className="w-8 h-8" />
              GitHub Integration
            </CardTitle>
            <CardDescription>
              Sync your repositories and track commit activity directly in TaskFlow.
            </CardDescription>
          </div>
          <Badge variant={isConnected ? "success" : "secondary"} className="h-7 px-4 rounded-full">
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
            <div className="flex flex-col items-center py-10 text-center space-y-4">
              <div className="p-6 bg-primary/5 rounded-full ring-8 ring-primary/5 mb-2">
                <Github className="w-12 h-12 text-primary" />
              </div>
              <div className="max-w-md">
                <h3 className="text-lg font-bold">Connect your GitHub account</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Once connected, you can link repositories to your projects to automatically sync activity logs and track progress.
                </p>
              </div>
              {isAdmin ? (
                <Button onClick={handleConnect} size="lg" className="rounded-xl px-8 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                  Connect GitHub
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground italic">Ask your Admin to connect GitHub for the organization.</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* ─── Available Repositories (Admin only) ─── */}
              {isAdmin && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Available Repositories ({repos.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={checkConnection} disabled={loading} className="rounded-xl">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleDisconnect} className="rounded-xl">
                        <Unlink className="w-4 h-4 mr-2" />
                        Disconnect
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {repos.map((repo) => (
                      <div
                        key={repo.id}
                        onClick={() => handleRepoClick(repo)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                          selectedRepo?.id === repo.id
                            ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/20'
                            : 'bg-card/50 hover:bg-accent/10 border-border'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                          <div className="flex items-center gap-3">
                            <Github className="w-5 h-5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{repo.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{repo.full_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedRepo?.id === repo.id ? (
                              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                                <GitCommit className="w-3 h-3 mr-1" /> Viewing
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                View commits <ChevronRight className="w-3 h-3" />
                              </span>
                            )}
                            <a
                              href={repo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-primary/10 rounded-xl transition-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4 text-primary" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
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
                        className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                          selectedProject?.id === project.id
                            ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/20'
                            : 'bg-card/50 hover:bg-accent/10 border-border'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                          <div className="flex items-center gap-3">
                            <FolderGit2 className="w-5 h-5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{project.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Link2 className="w-3 h-3 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground truncate">{project.githubRepo}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedProject?.id === project.id ? (
                              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                                <GitCommit className="w-3 h-3 mr-1" /> Viewing
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                View commits <ChevronRight className="w-3 h-3" />
                              </span>
                            )}
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

      {/* ─── Project Commit Logs (Any role clicks a linked project) ─── */}
      {selectedProject && renderCommitTimeline(
        projectCommits,
        loadingProjectCommits,
        `${selectedProject.name} → ${selectedProject.githubRepo}`,
        () => { setSelectedProject(null); setProjectCommits([]); }
      )}


    </div>
  );
};

export default Integrations;
