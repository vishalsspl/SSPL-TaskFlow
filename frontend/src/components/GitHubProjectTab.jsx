import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Github, GitCommit, GitPullRequest, ExternalLink, RefreshCw, Link as LinkIcon, AlertTriangle, GitBranch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { formatDistanceToNow } from 'date-fns';

const GitHubProjectTab = ({ projectId }) => {
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [linkedRepo, setLinkedRepo] = useState(null);
  const [repos, setRepos] = useState([]);
  const [activity, setActivity] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchStatus();
  }, [projectId]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      // 1. Check if GitHub is connected
      const reposRes = await api.get('/integrations/github/repos');
      setIsConnected(true);
      setRepos(reposRes.data);

      // 2. Get project details to see if linked
      const projectRes = await api.get(`/projects/${projectId}`);
      const repoFullName = projectRes.data.githubRepo;
      setLinkedRepo(repoFullName);

      if (repoFullName) {
        // Fetch branches
        try {
          const [owner, repo] = repoFullName.split('/');
          const branchRes = await api.get(`/integrations/github/branches/${owner}/${repo}`);
          setBranches(branchRes.data || []);
        } catch (err) {
          console.error('Failed to fetch branches:', err);
        }
        
        fetchActivity(projectId, selectedBranch);
      }
    } catch (error) {
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async (id, branch = '') => {
    setSyncing(true);
    try {
      const response = await api.get(`/integrations/github/activity/${id}${branch ? `?sha=${branch}` : ''}`);
      setActivity(response.data);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleBranchChange = (branchName) => {
    setSelectedBranch(branchName);
    fetchActivity(projectId, branchName);
  };

  const handleLinkRepo = async (repoFullName) => {
    try {
      await api.post(`/integrations/github/link/${projectId}`, { repoFullName });
      setLinkedRepo(repoFullName);
      fetchActivity(projectId);
      toast({
        title: "Repository Linked",
        description: `Successfully linked to ${repoFullName}`
      });
    } catch (error) {
      toast({
        title: "Linking Failed",
        description: "Failed to link repository to project.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-primary/50" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <Card className="border-dashed border-2 bg-accent/5">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="p-4 bg-muted rounded-full mb-4">
            <Github className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold">GitHub Not Connected</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-2">
            Ask an administrator to connect GitHub in the Integrations settings to enable repository tracking for this project.
          </p>
          <Button variant="outline" className="mt-6 rounded-xl" onClick={() => window.location.href = '/integrations'}>
            Go to Integrations
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!linkedRepo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            Link Repository
          </CardTitle>
          <CardDescription>
            Select a GitHub repository to track its activity within this project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SearchableSelect
                options={repos.map(r => ({ label: r.full_name, value: r.full_name }))}
                onChange={handleLinkRepo}
                placeholder="Search repositories..."
              />
            </div>
          </div>
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Once linked, TaskFlow will display recent commits and development activity in the project timeline. This helps managers and clients track technical progress without leaving the app.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-secondary rounded-2xl">
            <Github className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{linkedRepo.split('/')[1]}</h3>
            <p className="text-xs text-muted-foreground">{linkedRepo}</p>
          </div>
          <Badge variant="secondary" className="rounded-full">Active</Badge>
        </div>
        <div className="flex gap-2">
          {branches.length > 0 && (
            <Select
              value={selectedBranch || "default"}
              onValueChange={(val) => handleBranchChange(val === "default" ? "" : val)}
            >
              <SelectTrigger className="w-[160px] h-9 rounded-xl bg-background/50 border-border/50 hover:bg-accent/10 transition-all font-semibold">
                <SelectValue placeholder="Branch" />
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
          )}
          <Button variant="outline" size="sm" onClick={() => fetchActivity(projectId, selectedBranch)} disabled={syncing} className="rounded-xl">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => window.open(`https://github.com/${linkedRepo}`, '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            View on GitHub
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black text-gray-500 uppercase tracking-widest Montserrat">Recent Commit Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <GitCommit className="w-10 h-10 text-muted-foreground mx-auto opacity-20" />
              <p className="text-sm text-muted-foreground italic">No recent commits found</p>
            </div>
          ) : (
            <div className="relative space-y-4">
              {/* Timeline vertical line - hidden on mobile if too cramped */}
              <div className="absolute left-[19px] sm:left-[21px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-border/50 via-border to-border/50 hidden xs:block" />
              
              {activity.map((commit) => (
                <div key={commit.sha} className="relative flex items-start gap-3 sm:gap-4 group">
                  {/* Timeline dot/icon */}
                  <div className="relative z-10 shrink-0 mt-1 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-card border-2 border-border flex items-center justify-center group-hover:border-primary transition-colors hidden xs:flex">
                    <GitCommit className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  
                  {/* Commit card content */}
                  <div className="flex-1 min-w-0 p-3 sm:p-4 rounded-2xl bg-secondary/30 border border-border/50 group-hover:bg-secondary/50 transition-all shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {commit.message}
                      </p>
                      <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(commit.date), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                          {commit.author.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{commit.author}</p>
                          {commit.email && (
                            <p className="text-[8px] sm:text-[9px] text-muted-foreground/60">{commit.email}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-muted-foreground/30 hidden sm:inline">•</span>
                      <code className="text-[9px] sm:text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground/70 font-mono">
                        {commit.sha.substring(0, 7)}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GitHubProjectTab;
