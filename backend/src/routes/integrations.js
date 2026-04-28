import express from 'express';
import {
  getGitHubAuthUrl,
  handleGitHubCallback,
  getGitHubRepos,
  getRepoCommits,
  getLinkedProjects,
  linkProjectToRepo,
  getRepoActivity,
  getRepoBranches,
  disconnectGitHub
} from '../controllers/integrationController.js';
import { authenticate } from '../middleware/auth.js';
import attachTenantDb from '../middleware/tenantMiddleware.js';

const router = express.Router();

// Public callback (GitHub redirects the browser here)
router.get('/github/callback', handleGitHubCallback);

// Protected routes
router.use(authenticate);
router.use(attachTenantDb);

router.get('/github/auth', getGitHubAuthUrl);
router.get('/github/repos', getGitHubRepos);
router.post('/github/link/:projectId', linkProjectToRepo);
router.get('/github/activity/:projectId', getRepoActivity);
router.get('/github/branches/:owner/:repo', getRepoBranches);
router.get('/github/commits/:owner/:repo', getRepoCommits);
router.get('/github/linked-projects', getLinkedProjects);
router.delete('/github', disconnectGitHub);

export default router;
