import axios from 'axios';
import { Octokit } from '@octokit/rest';
import prisma from '../lib/prisma.js';

export const getGitHubAuthUrl = async (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_CALLBACK_URL;
  const scope = 'repo,user';
  
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${req.user.organizationId}`;
  
  res.json({ url });
};

export const handleGitHubCallback = async (req, res) => {
  const { code, state } = req.query; // state is organizationId
  const organizationId = state;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: process.env.GITHUB_CALLBACK_URL,
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

    await prisma.integration.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider: 'github'
        }
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
      },
      create: {
        organizationId,
        provider: 'github',
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        organizationId,
        action: 'INTEGRATION_CONNECTED',
        entity: 'integration',
        details: { provider: 'github' }
      }
    });

    res.send('<script>window.close();</script>'); // Close the popup
  } catch (error) {
    console.error('GitHub OAuth Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to authenticate with GitHub' });
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
    const project = await req.db.project.update({
      where: { id: projectId, organizationId: req.user.organizationId },
      data: { githubRepo: repoFullName }
    });

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to link repository' });
  }
};

export const getRepoActivity = async (req, res) => {
  const { projectId } = req.params;

  const project = await req.db.project.findUnique({
    where: { id: projectId, organizationId: req.user.organizationId }
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

    res.json({ message: 'GitHub disconnected successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect GitHub' });
  }
};
