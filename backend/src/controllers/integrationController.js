import axios from 'axios';
import { Octokit } from '@octokit/rest';
import prisma from '../lib/prisma.js';
import tenantDbManager from '../lib/tenantDbManager.js';


const createNotification = async (req, { userId, title, message, type }) => {
  try {
    const notification = await req.db.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        organizationId: req.user.organizationId,
      },
    });

    if (req.io) {
      req.io.to(`org-${req.user.organizationId}`).emit('new-notification', notification);
    }
    return notification;
  } catch (error) {
    console.error('Failed to create internal notification:', error);
  }
};

// ── Helper: Get org's GitHub config from DB ──────────────────────────────
const getOrgGitHubConfig = async (organizationId) => {
  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId,
        provider: 'github'
      }
    }
  });
  return integration?.config || null;
};

// ── Save GitHub OAuth credentials for an organization ────────────────────
export const saveGitHubConfig = async (req, res) => {
  const { clientId, clientSecret, callbackUrl } = req.body;
  const organizationId = req.user.organizationId;

  if (!clientId || !clientSecret || !callbackUrl) {
    return res.status(400).json({ error: 'Client ID, Client Secret, and Callback URL are required.' });
  }

  try {
    await prisma.integration.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider: 'github'
        }
      },
      update: {
        config: { clientId, clientSecret, callbackUrl },
        accessToken: '', // Clear old token so user must re-authenticate
        refreshToken: null,
      },
      create: {
        organizationId,
        provider: 'github',
        accessToken: '', // Will be filled after OAuth connect
        config: { clientId, clientSecret, callbackUrl }
      }
    });

    res.json({ message: 'GitHub credentials saved successfully.' });
  } catch (error) {
    console.error('Save GitHub Config Error:', error.message);
    res.status(500).json({ error: 'Failed to save GitHub credentials.' });
  }
};

// ── Get GitHub config (safe — never returns client secret) ───────────────
export const getGitHubConfig = async (req, res) => {
  const organizationId = req.user.organizationId;
  const config = await getOrgGitHubConfig(organizationId);

  if (!config || !config.clientId) {
    return res.json({ configured: false });
  }

  // Check if the org has completed the OAuth flow (has a real access token)
  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId,
        provider: 'github'
      }
    }
  });

  const isConnected = integration?.accessToken && integration.accessToken !== '';

  res.json({
    configured: true,
    connected: isConnected,
    clientId: config.clientId,
    callbackUrl: config.callbackUrl
    // Never send clientSecret to the frontend
  });
};

// ── Generate GitHub OAuth URL using org-specific credentials ─────────────
export const getGitHubAuthUrl = async (req, res) => {
  const organizationId = req.user.organizationId;
  const config = await getOrgGitHubConfig(organizationId);

  if (!config || !config.clientId) {
    return res.status(400).json({ error: 'GitHub is not configured for this organization. Please save your credentials first.' });
  }

  const scope = 'repo,user';
  const state = `${req.user.id}:${organizationId}`;
  const url = `https://github.com/login/oauth/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.callbackUrl)}&scope=${scope}&state=${state}&prompt=consent`;

  res.json({ url });
};

// ── Handle GitHub OAuth callback using org-specific credentials ──────────
export const handleGitHubCallback = async (req, res) => {
  const { code, state } = req.query; 
  
  if (!code || !state) {
    return res.status(400).json({ error: 'No code or state provided' });
  }

  const [userId, organizationId] = state.split(':');

  if (!userId || !organizationId) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  // Populate req.user for logging/notifications since this is a public callback route
  if (!req.user) {
    req.user = { id: userId, organizationId };
  }

  // Ensure req.db is available for the callback
  if (!req.db) {
    try {
      const org = await prisma.organization.findUnique({ where: { id: organizationId } });
      if (org?.dbUrl) {
        req.db = await tenantDbManager.getClient(org.dbUrl);
      }
    } catch (dbErr) {
      console.error('[GitHub Callback] Failed to attach tenant DB:', dbErr.message);
    }
  }

  try {
    // Read this org's GitHub credentials from DB
    const config = await getOrgGitHubConfig(organizationId);
    if (!config || !config.clientId || !config.clientSecret) {
      return res.status(400).json({ error: 'GitHub credentials not configured for this organization.' });
    }

    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.callbackUrl,
    }, {
      headers: { Accept: 'application/json' }
    });

    console.log('GitHub Token Response:', response.data);

    const { access_token, refresh_token, expires_in, error: githubError, error_description } = response.data;

    if (githubError) {
      console.error('GitHub API Error:', githubError, error_description);
      return res.status(400).json({ error: error_description || githubError });
    }

    if (!access_token) {
      return res.status(400).json({ error: 'Failed to get access token' });
    }

    const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

    // Update the existing integration (created during saveGitHubConfig) with the real token
    await prisma.integration.update({
      where: {
        organizationId_provider: {
          organizationId,
          provider: 'github'
        }
      },
      data: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
      }
    });


    // Log activity
    const logData = {
      userId: req.user.id,
      organizationId,
      action: 'INTEGRATION_CONNECTED',
      entity: 'integration',
      details: { provider: 'github' }
    };
    await prisma.activityLog.create({ data: logData });
    // Also log to tenant DB if available
    if (req.db) {
      await req.db.activityLog.create({ data: logData });
    }

    createNotification(req, {
      userId: req.user.id,
      title: 'GitHub Connected',
      message: 'GitHub has been successfully connected to your organization.',
      type: 'INTEGRATION_CONNECTED'
    });

    res.send('<script>window.close();</script>'); // Close the popup
  } catch (error) {
    console.error('GitHub OAuth Error FULL:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('GitHub Error Details:', JSON.stringify(error.response.data));
    }
    res.status(500).json({ 
      error: 'Failed to authenticate with GitHub', 
      details: error.response?.data?.error_description || error.message 
    });
  }
};


export const getGitHubRepos = async (req, res) => {
  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId: req.user.organizationId,
        provider: 'github'
      }
    }
  });

  if (!integration) {
    return res.status(404).json({ error: 'GitHub not connected' });
  }

  try {
    const octokit = new Octokit({ auth: integration.accessToken });
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100
    });

    res.json(data.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      url: repo.html_url
    })));
  } catch (error) {
    console.error('GitHub API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
};

export const linkProjectToRepo = async (req, res) => {
  const { projectId } = req.params;
  const { repoFullName } = req.body;

  try {
    // Auto-migrate: check if githubRepo column exists in tenant DB
    try {
      await req.db.$queryRawUnsafe('SELECT "githubRepo" FROM "Project" LIMIT 1');
    } catch (err) {
      if (err.message.includes('column "githubRepo" does not exist') || err.message.includes('does not exist')) {
        await req.db.$executeRawUnsafe('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "githubRepo" TEXT');
        await req.db.$executeRawUnsafe('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "githubInstallationId" TEXT');
      }
    }

    const project = await req.db.project.update({
      where: { id: projectId, organizationId: req.user.organizationId },
      data: { githubRepo: repoFullName }
    });

    // Log activity
    const action = repoFullName ? 'REPO_LINKED' : 'REPO_UNLINKED';
    await req.db.activityLog.create({
      data: {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        projectId,
        action,
        entity: 'project',
        details: { repo: repoFullName, projectName: project.name }
      }
    });

    createNotification(req, {
      userId: req.user.id,
      title: repoFullName ? 'Repository Linked' : 'Repository Unlinked',
      message: repoFullName
        ? `Repository ${repoFullName} linked to project ${project.name}`
        : `Repository unlinked from project ${project.name}`,
      type: action
    });

    res.json(project);
  } catch (error) {
    console.error('Link Project to Repo Error:', error.message);
    res.status(500).json({ error: 'Failed to link repository' });
  }
};

export const getRepoActivity = async (req, res) => {
  const { projectId } = req.params;

  const project = await req.db.project.findUnique({
    where: { id: projectId, organizationId: req.user.organizationId },
    select: { id: true, name: true } // Only fetch what's needed safely
  });

  if (!project || !project.githubRepo) {
    return res.status(400).json({ error: 'Project not linked to a repository' });
  }

  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId: req.user.organizationId,
        provider: 'github'
      }
    }
  });

  if (!integration) {
    return res.status(404).json({ error: 'GitHub not connected' });
  }

  try {
    const octokit = new Octokit({ auth: integration.accessToken });
    const [owner, repo] = project.githubRepo.split('/');

    const { sha } = req.query;

    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      sha,
      per_page: 10
    });

    res.json(commits.map(c => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author.name,
      email: c.commit.author.email,
      date: c.commit.author.date,
      url: c.html_url
    })));
  } catch (error) {
    if (error.status === 409 || error.response?.status === 409 || error.message?.includes('empty')) {
      console.log(`GitHub Info: Repository ${project.githubRepo} is empty.`);
      return res.json([]);
    }
    console.error('GitHub API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch repository activity' });
  }
};

export const getRepoCommits = async (req, res) => {
  const { owner, repo } = req.params;

  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId: req.user.organizationId,
        provider: 'github'
      }
    }
  });

  if (!integration) {
    return res.status(404).json({ error: 'GitHub not connected' });
  }

  try {
    const octokit = new Octokit({ auth: integration.accessToken });

    const { sha } = req.query;

    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      sha,
      per_page: 20
    });

    res.json(commits.map(c => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author.name,
      email: c.commit.author.email,
      authorAvatar: c.author?.avatar_url || null,
      date: c.commit.author.date,
      url: c.html_url
    })));
  } catch (error) {
    if (error.status === 409 || error.response?.status === 409 || error.message?.includes('empty')) {
      console.log(`GitHub Info: Repository ${owner}/${repo} is empty.`);
      return res.json([]);
    }
    console.error('GitHub Commits Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch commits' });
  }
};

export const getRepoBranches = async (req, res) => {
  const { owner, repo } = req.params;

  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId: req.user.organizationId,
        provider: 'github'
      }
    }
  });

  if (!integration) {
    return res.status(404).json({ error: 'GitHub not connected' });
  }

  try {
    const octokit = new Octokit({ auth: integration.accessToken });
    const { data: branches } = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100
    });

    res.json(branches.map(b => ({
      name: b.name,
      protected: b.protected
    })));
  } catch (error) {
    console.error('GitHub Branches Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
};

export const getLinkedProjects = async (req, res) => {
  const { organizationId, role, id: userId } = req.user;

  try {
    // Auto-migrate: check if githubRepo column exists in tenant DB
    try {
      await req.db.$queryRawUnsafe('SELECT "githubRepo" FROM "Project" LIMIT 1');
    } catch (err) {
      if (err.message.includes('column "githubRepo" does not exist') || err.message.includes('does not exist')) {
        console.log(`[GitHub Integration] Auto-migrating Project table for tenant: ${organizationId}`);
        try {
          await req.db.$executeRawUnsafe('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "githubRepo" TEXT');
          await req.db.$executeRawUnsafe('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "githubInstallationId" TEXT');
        } catch (migrationErr) {
          console.error('[GitHub Integration] Migration failed:', migrationErr.message);
        }
      }
    }

    let where = {
      organizationId,
      githubRepo: { not: null }
    };

    // MANAGER/MEMBER: only see their own projects
    if (role === 'MANAGER') {
      where.OR = [
        { managerId: userId },
        { workloads: { some: { userId } } }
      ];
    } else if (role === 'MEMBER') {
      where.workloads = { some: { userId } };
    }
    // ADMIN: sees all org projects (no extra filter)

    const projects = await req.db.project.findMany({
      where,
      select: {
        id: true,
        name: true,
        githubRepo: true,
        status: true,
        manager: {
          select: {
            name: true,
            avatar: true
          }
        },
        workloads: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(projects);
  } catch (error) {
    console.error('Linked Projects Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch linked projects' });
  }
};


export const disconnectGitHub = async (req, res) => {
  try {
    await prisma.integration.delete({
      where: {
        organizationId_provider: {
          organizationId: req.user.organizationId,
          provider: 'github'
        }
      }
    });

    // Log activity
    const logData = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      action: 'INTEGRATION_DISCONNECTED',
      entity: 'integration',
      details: { provider: 'github' }
    };
    await prisma.activityLog.create({ data: logData });
    if (req.db) {
      await req.db.activityLog.create({ data: logData });
    }

    createNotification(req, {
      userId: req.user.id,
      title: 'GitHub Disconnected',
      message: 'GitHub has been disconnected from your organization.',
      type: 'INTEGRATION_DISCONNECTED'
    });

    res.json({ message: 'GitHub disconnected successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect GitHub' });
  }
};
