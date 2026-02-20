import nodemailer from 'nodemailer';

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendTaskAssignmentEmail = async (to, taskTitle, projectName, assignedByName, { priority, dueDate, status, description } = {}) => {
  try {
    if (!to) return;

    const priorityColors = { HIGH: '#DC2626', MEDIUM: '#D97706', LOW: '#16A34A' };
    const priorityColor = priorityColors[priority] || '#6B7280';
    const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No due date';
    const statusStr = status ? status.replace('_', ' ') : 'TODO';

    const info = await transporter.sendMail({
      from: '"TasFlow Notification" <noreply@tasflow.com>',
      to,
      subject: `New Task Assigned: ${taskTitle}`,
      text: `Hello,\n\nYou have been assigned a new task "${taskTitle}" in project "${projectName}" by ${assignedByName}.\n\nTask Details:\n- Priority: ${priority || 'MEDIUM'}\n- Status: ${statusStr}\n- Due Date: ${dueDateStr}\n- Description: ${description || 'No description'}\n\nPlease log in to TasFlow to view and manage this task.\n\nBest regards,\nTasFlow Team`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb; margin-bottom: 4px;">New Task Assigned</h2>
          <p style="color: #6B7280; margin-top: 0;">You have a new task waiting for you.</p>
          <hr style="border: 1px solid #eee; margin: 16px 0;">
          <p>Hello,</p>
          <p>You have been assigned a new task by <strong>${assignedByName}</strong>.</p>

          <div style="background: #F9FAFB; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #111;">${taskTitle}</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6B7280; width: 120px;">Project</td>
                <td style="padding: 6px 0; font-weight: 600;">${projectName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280;">Priority</td>
                <td style="padding: 6px 0;"><span style="background: ${priorityColor}; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${priority || 'MEDIUM'}</span></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280;">Status</td>
                <td style="padding: 6px 0;">${statusStr}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280;">Due Date</td>
                <td style="padding: 6px 0;">${dueDateStr}</td>
              </tr>
              ${description ? `<tr>
                <td style="padding: 6px 0; color: #6B7280; vertical-align: top;">Description</td>
                <td style="padding: 6px 0; line-height: 1.5;">${description}</td>
              </tr>` : ''}
            </table>
          </div>

          <div style="margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/tasks" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Task</a>
          </div>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message from TasFlow.</p>
        </div>
      `,
    });

    console.log('Task Email sent: %s', info.messageId);
    if (nodemailer.getTestMessageUrl(info)) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    return null;
  }
};

/**
 * Send a rich project assignment email to the Manager.
 * @param {string} to - Manager's email
 * @param {object} project - Project object { name, description, status, startDate, endDate, totalBudget }
 * @param {object} manager - Manager object { name }
 * @param {object|null} client - Client user object { name, email } or null
 * @param {Array} teamMembers - Array of user objects { name, role, email }
 * @param {string} assignedByName - Name of the admin who assigned the project
 */
export const sendProjectManagerEmail = async (to, project, manager, client, teamMembers = [], assignedByName) => {
  try {
    if (!to) return;

    const startStr = project.startDate ? new Date(project.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
    const endStr = project.endDate ? new Date(project.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
    const budgetStr = project.totalBudget ? `₹${Number(project.totalBudget).toLocaleString('en-IN')}` : 'Not specified';
    const statusColors = { PLANNING: '#6366F1', IN_PROGRESS: '#F59E0B', COMPLETED: '#10B981', ON_HOLD: '#6B7280' };
    const statusColor = statusColors[project.status] || '#6B7280';

    const teamRows = teamMembers.length > 0
      ? teamMembers.map(m => `
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;">${m.name}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#6B7280;">${m.role}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#6B7280;">${m.email}</td>
                </tr>`).join('')
      : '<tr><td colspan="3" style="padding:8px 12px;color:#9CA3AF;">No team members assigned yet</td></tr>';

    const info = await transporter.sendMail({
      from: '"TasFlow" <noreply@tasflow.com>',
      to,
      subject: `You've been assigned as Manager: ${project.name}`,
      text: `Hello ${manager.name},\n\nYou have been assigned as the Manager for the project "${project.name}" by ${assignedByName}.\n\nProject Details:\n- Status: ${project.status || 'PLANNING'}\n- Start Date: ${startStr}\n- End Date: ${endStr}\n- Budget: ${budgetStr}\n- Description: ${project.description || 'No description provided'}\n- Client: ${client ? client.name : 'Not assigned'}\n\nTeam Members:\n${teamMembers.map(m => `- ${m.name} (${m.role})`).join('\n') || 'No members assigned yet'}\n\nPlease log in to TasFlow to view and manage this project.\n\nBest regards,\nTasFlow Team`,
      html: `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#1F2937;">
  <div style="background:linear-gradient(135deg,#1D4ED8,#3B82F6);padding:32px 28px;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;color:#fff;font-size:22px;">📋 Project Assigned to You</h1>
    <p style="color:#BFDBFE;margin:6px 0 0;">You are now the Manager for a new project.</p>
  </div>

  <div style="background:#F9FAFB;padding:28px;border-radius:0 0 12px 12px;border:1px solid #E5E7EB;">
    <p>Hello <strong>${manager.name}</strong>,</p>
    <p>You have been assigned as the <strong>Project Manager</strong> for <strong>${project.name}</strong> by <strong>${assignedByName}</strong>.</p>

    <!-- Project Details Card -->
    <div style="background:#fff;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #3B82F6;box-shadow:0 1px 4px rgba(0,0,0,0.07);">
      <h2 style="margin:0 0 14px;font-size:18px;color:#111827;">${project.name}</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:7px 0;color:#6B7280;width:130px;">Status</td>
          <td style="padding:7px 0;"><span style="background:${statusColor};color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">${project.status || 'PLANNING'}</span></td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#6B7280;">Start Date</td>
          <td style="padding:7px 0;">${startStr}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#6B7280;">End Date</td>
          <td style="padding:7px 0;">${endStr}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#6B7280;">Budget</td>
          <td style="padding:7px 0;font-weight:600;">${budgetStr}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#6B7280;">Client</td>
          <td style="padding:7px 0;">${client ? client.name : '<em style="color:#9CA3AF;">Not assigned</em>'}</td>
        </tr>
        ${project.description ? `<tr>
          <td style="padding:7px 0;color:#6B7280;vertical-align:top;">Description</td>
          <td style="padding:7px 0;line-height:1.6;">${project.description}</td>
        </tr>` : ''}
      </table>
    </div>

    <!-- Team Members -->
    <h3 style="font-size:15px;margin:24px 0 10px;color:#374151;">👥 Your Team Members</h3>
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);">
      <thead>
        <tr style="background:#F3F4F6;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6B7280;text-transform:uppercase;">Name</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6B7280;text-transform:uppercase;">Role</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6B7280;text-transform:uppercase;">Email</th>
        </tr>
      </thead>
      <tbody>${teamRows}</tbody>
    </table>

    <div style="margin:28px 0 8px;">
      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/projects" style="background:#2563EB;color:#fff;padding:13px 26px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">View Project →</a>
    </div>
    <hr style="border:1px solid #E5E7EB;margin:24px 0 12px;">
    <p style="color:#9CA3AF;font-size:12px;">This is an automated message from TasFlow. Do not reply to this email.</p>
  </div>
</div>`,
    });

    console.log('Manager Project Email sent: %s', info.messageId);
    if (nodemailer.getTestMessageUrl(info)) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (error) {
    console.error('Error sending manager project email:', error);
    return null;
  }
};

/**
 * Send a rich project notification email to the Client.
 * @param {string} to - Client's email
 * @param {object} project - Project object
 * @param {object} manager - Manager user object { name, email }
 * @param {Array} teamMembers - Array of user objects { name, role }
 * @param {string} assignedByName - Admin who set this up
 */
export const sendProjectClientEmail = async (to, project, manager, teamMembers = [], assignedByName) => {
  try {
    if (!to) return;

    const startStr = project.startDate ? new Date(project.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
    const endStr = project.endDate ? new Date(project.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
    const statusColors = { PLANNING: '#6366F1', IN_PROGRESS: '#F59E0B', COMPLETED: '#10B981', ON_HOLD: '#6B7280' };
    const statusColor = statusColors[project.status] || '#6B7280';

    const teamRows = teamMembers.length > 0
      ? teamMembers.map(m => `
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;">${m.name}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#6B7280;">${m.role}</td>
                </tr>`).join('')
      : '<tr><td colspan="2" style="padding:8px 12px;color:#9CA3AF;">Team is being assembled</td></tr>';

    const info = await transporter.sendMail({
      from: '"TasFlow" <noreply@tasflow.com>',
      to,
      subject: `Your Project Is Ready: ${project.name}`,
      text: `Hello,\n\nGreat news! The project "${project.name}" has been set up for you on TasFlow.\n\nProject Details:\n- Status: ${project.status || 'PLANNING'}\n- Start Date: ${startStr}\n- End Date: ${endStr}\n- Description: ${project.description || 'No description provided'}\n\nYour Project Manager: ${manager ? `${manager.name} (${manager.email})` : 'Not assigned'}\n\nTeam Members:\n${teamMembers.map(m => `- ${m.name} (${m.role})`).join('\n') || 'Being assembled'}\n\nLog in to TasFlow to track progress.\n\nBest regards,\nTasFlow Team`,
      html: `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#1F2937;">
  <div style="background:linear-gradient(135deg,#059669,#10B981);padding:32px 28px;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;color:#fff;font-size:22px;">🚀 Your Project Is Live!</h1>
    <p style="color:#A7F3D0;margin:6px 0 0;">A new project has been set up for you.</p>
  </div>

  <div style="background:#F9FAFB;padding:28px;border-radius:0 0 12px 12px;border:1px solid #E5E7EB;">
    <p>Hello,</p>
    <p>Great news! The project <strong>${project.name}</strong> has been set up for you on TasFlow${assignedByName ? ` by <strong>${assignedByName}</strong>` : ''}.</p>

    <!-- Project Details Card -->
    <div style="background:#fff;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #10B981;box-shadow:0 1px 4px rgba(0,0,0,0.07);">
      <h2 style="margin:0 0 14px;font-size:18px;color:#111827;">${project.name}</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:7px 0;color:#6B7280;width:130px;">Status</td>
          <td style="padding:7px 0;"><span style="background:${statusColor};color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">${project.status || 'PLANNING'}</span></td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#6B7280;">Start Date</td>
          <td style="padding:7px 0;">${startStr}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#6B7280;">End Date</td>
          <td style="padding:7px 0;">${endStr}</td>
        </tr>
        ${project.description ? `<tr>
          <td style="padding:7px 0;color:#6B7280;vertical-align:top;">Description</td>
          <td style="padding:7px 0;line-height:1.6;">${project.description}</td>
        </tr>` : ''}
      </table>
    </div>

    <!-- Manager Info -->
    ${manager ? `
    <div style="background:#EFF6FF;border-radius:8px;padding:16px;margin-bottom:20px;">
      <h3 style="margin:0 0 6px;font-size:14px;color:#1D4ED8;">🧑‍💼 Your Project Manager</h3>
      <p style="margin:0;font-size:15px;font-weight:600;">${manager.name}</p>
      <p style="margin:2px 0 0;font-size:13px;color:#6B7280;">${manager.email}</p>
    </div>` : ''}

    <!-- Team Members -->
    <h3 style="font-size:15px;margin:0 0 10px;color:#374151;">👥 Your Project Team</h3>
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);">
      <thead>
        <tr style="background:#F3F4F6;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6B7280;text-transform:uppercase;">Name</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6B7280;text-transform:uppercase;">Role</th>
        </tr>
      </thead>
      <tbody>${teamRows}</tbody>
    </table>

    <div style="margin:28px 0 8px;">
      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" style="background:#059669;color:#fff;padding:13px 26px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Track Your Project →</a>
    </div>
    <hr style="border:1px solid #E5E7EB;margin:24px 0 12px;">
    <p style="color:#9CA3AF;font-size:12px;">This is an automated message from TasFlow. Do not reply to this email.</p>
  </div>
</div>`,
    });

    console.log('Client Project Email sent: %s', info.messageId);
    if (nodemailer.getTestMessageUrl(info)) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (error) {
    console.error('Error sending client project email:', error);
    return null;
  }
};

// Keep old function name as alias for backward compat
export const sendProjectAssignmentEmail = sendProjectManagerEmail;


export const sendUserApprovalEmail = async (to, userName) => {
  try {
    if (!to) return;

    const info = await transporter.sendMail({
      from: '"TasFlow Notification" <noreply@tasflow.com>',
      to,
      subject: 'Account Approved - Welcome to TasFlow',
      text: `Hello ${userName},\n\nYour account has been approved by the administrator.\n\nYou can now log in to TasFlow and access your dashboard.\n\nLogin here: ${process.env.CLIENT_URL || 'http://localhost:5173'}/login\n\nBest regards,\nTasFlow Team`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Account Approved!</h2>
          <p>Hello <strong>${userName}</strong>,</p>
          <p>Great news! Your account has been approved by the administrator.</p>
          <p>You can now log in to TasFlow and start collaborating.</p>
          <div style="margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Login to TasFlow</a>
          </div>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message from TasFlow.</p>
        </div>
      `,
    });

    console.log('Approval Email sent: %s', info.messageId);
    if (nodemailer.getTestMessageUrl(info)) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    return null;
  }
};
