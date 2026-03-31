import puppeteer from 'puppeteer';
import prisma from '../lib/prisma.js';
import { buildProjectReportHTML } from './reportTemplate.js';


export const generateReport = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await req.db.project.findFirst({
      where: { id: projectId, organizationId: req.user.organizationId },
      include: {
        client: { select: { name: true } },
        manager: { select: { name: true } },
        phases: {
          include: {
            tasks: {
              select: { status: true }
            }
          }
        },
        tasks: {
          include: {
            assignees: {
              include: {
                user: { select: { id: true, name: true, role: true } }
              }
            }
          }
        },
        activityLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true } }
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Prepare team members data
    const memberMap = new Map();
    project.tasks.forEach(task => {
      task.assignees.forEach(assignee => {
        const u = assignee.user;
        if (!memberMap.has(u.id)) {
          memberMap.set(u.id, {
            name: u.name,
            role: u.role,
            tasksCompleted: 0,
            tasksInProgress: 0
          });
        }
        const stats = memberMap.get(u.id);
        if (task.status === 'COMPLETED') stats.tasksCompleted++;
        if (task.status === 'IN_PROGRESS') stats.tasksInProgress++;
      });
    });

    const projectData = {
      projectName: project.name,
      clientName: project.client?.name || 'Internal',
      reportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      projectManager: project.manager?.name || '-',
      totalTasks: project.tasks.length,
      completedTasks: project.tasks.filter(t => t.status === 'COMPLETED').length,
      inProgressTasks: project.tasks.filter(t => t.status === 'IN_PROGRESS').length,
      todoTasks: project.tasks.filter(t => t.status === 'TODO').length,
      sprints: project.phases.map(p => ({
        name: p.name,
        startDate: p.startDate ? new Date(p.startDate).toLocaleDateString() : '-',
        endDate: p.endDate ? new Date(p.endDate).toLocaleDateString() : '-',
        totalTasks: p.tasks.length,
        completedTasks: p.tasks.filter(t => t.status === 'COMPLETED').length,
        status: p.status,
      })),
      teamMembers: Array.from(memberMap.values()),
      recentActivity: project.activityLogs.map(a => ({
        date: new Date(a.createdAt).toLocaleDateString(),
        user: a.user.name,
        action: a.action,
        type: a.entity?.toLowerCase() || 'task', // map entity to type
      })),
    };

    req.body.html = buildProjectReportHTML(projectData);
    return exportToPDF(req, res);
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: 'Failed to generate report data', details: error.message });
  }
};

export const exportToPDF = async (req, res) => {
  const { html } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML content required' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
    });
    const page = await browser.newPage();

    // Set a longer timeout for slow systems
    await page.setDefaultNavigationTimeout(60000);

    await page.setContent(html, {
      waitUntil: ['domcontentloaded', 'networkidle2'],
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    await browser.close();

    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="project-report.pdf"');
    res.send(pdf);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      error: 'Failed to generate PDF',
      details: error.message,
    });
  }
};

export const exportToPNG = async (req, res) => {
  const { html } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML content required' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setViewport({
      width: 1920,
      height: 1080,
    });

    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'png',
    });

    await browser.close();

    res.contentType('image/png');
    res.send(screenshot);
  } catch (error) {
    console.error('PNG generation error:', error);
    res.status(500).json({
      error: 'Failed to generate PNG',
      details: error.message,
    });
  }
};
