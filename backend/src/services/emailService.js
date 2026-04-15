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

const DEFAULT_FROM = `"${process.env.SMTP_FROM_NAME || 'TaskFlow'}" <${process.env.SMTP_USER}>`;

export const sendTaskAssignmentEmail = async (to, taskTitle, projectName, assignedByName, { priority, dueDate, status, description, baseUrl } = {}) => {
  try {
    if (!to) return;

    const priorityColors = { HIGH: '#DC2626', MEDIUM: '#D97706', LOW: '#16A34A' };
    const priorityColor = priorityColors[priority] || '#6B7280';
    const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No due date';
    const statusStr = status ? status.replace('_', ' ') : 'TODO';

    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: `New Task Assigned: ${taskTitle}`,
      text: `Hello,\n\nYou have been assigned a new task "${taskTitle}" in project "${projectName}" by ${assignedByName}.\n\nTask Details:\n- Priority: ${priority || 'MEDIUM'}\n- Status: ${statusStr}\n- Due Date: ${dueDateStr}\n- Description: ${description || 'No description'}\n\nPlease log in to TaskFlow to view and manage this task.\n\nBest regards,\nTaskFlow Team`,
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
            <a href="${baseUrl || process.env.CLIENT_URL || 'http://localhost:5173'}/tasks" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Task</a>
          </div>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message from TaskFlow.</p>
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
 * Send an email notification when a task status is updated.
 * @param {string} to - Recipient's email
 * @param {string} taskTitle - Title of the task
 * @param {string} projectName - Name of the project
 * @param {string} newStatus - The new status of the task
 * @param {string} updatedBy - Name of the person who updated the status
 */
export const sendTaskStatusUpdateEmail = async (to, taskTitle, projectName, newStatus, updatedBy, baseUrl) => {
  try {
    if (!to) return;

    const statusColors = {
      TODO: '#6B7280',
      IN_PROGRESS: '#2563EB',
      COMPLETED: '#16A34A',
      REJECTED: '#DC2626',
      ON_HOLD: '#D97706'
    };
    const statusColor = statusColors[newStatus] || '#6B7280';
    const statusStr = newStatus.replace('_', ' ');

    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: `Task Status Updated: ${taskTitle}`,
      text: `Hello,\n\nThe status of task "${taskTitle}" in project "${projectName}" has been updated to "${statusStr}" by ${updatedBy}.\n\nPlease log in to TaskFlow to view the details.\n\nBest regards,\nTaskFlow Team`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb; margin-bottom: 4px;">Task Status Updated</h2>
          <p style="color: #6B7280; margin-top: 0;">An update has been made to a task assigned to you.</p>
          <hr style="border: 1px solid #eee; margin: 16px 0;">
          <p>Hello,</p>
          <p>The status of task <strong>${taskTitle}</strong> has been updated by <strong>${updatedBy}</strong>.</p>

          <div style="background: #F9FAFB; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6B7280; width: 120px;">Project</td>
                <td style="padding: 6px 0; font-weight: 600;">${projectName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280;">Task</td>
                <td style="padding: 6px 0; font-weight: 600;">${taskTitle}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280;">New Status</td>
                <td style="padding: 6px 0;"><span style="background: ${statusColor}; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${statusStr}</span></td>
              </tr>
            </table>
          </div>

          <div style="margin: 30px 0;">
            <a href="${baseUrl || process.env.CLIENT_URL || 'http://localhost:5173'}/tasks" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Tasks</a>
          </div>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message from TaskFlow.</p>
        </div>
      `,
    });

    console.log('Status Update Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending status update email:', error);
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
export const sendProjectManagerEmail = async (to, project, manager, client, assignedByName, baseUrl) => {
  try {
    if (!to) return;

    const startStr = project.startDate ? new Date(project.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
    const endStr = project.endDate ? new Date(project.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
    const budgetStr = project.totalBudget ? `₹${Number(project.totalBudget).toLocaleString('en-IN')}` : 'Not specified';
    const statusColors = { PLANNING: '#6366F1', IN_PROGRESS: '#F59E0B', COMPLETED: '#10B981', ON_HOLD: '#6B7280' };
    const statusColor = statusColors[project.status] || '#6B7280';



    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: `You've been assigned as Manager: ${project.name}`,
      text: `Hello ${manager.name},\n\nYou have been assigned as the Manager for the project "${project.name}" by ${assignedByName}.\n\nProject Details:\n- Status: ${project.status || 'PLANNING'}\n- Start Date: ${startStr}\n- End Date: ${endStr}\n- Budget: ${budgetStr}\n- Description: ${project.description || 'No description provided'}\n- Client: ${client ? client.name : 'Not assigned'}\n\nPlease log in to TaskFlow to view and manage this project.\n\nBest regards,\nTaskFlow Team`,
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



    <div style="margin:28px 0 8px;">
      <a href="${baseUrl || process.env.CLIENT_URL || 'http://localhost:5173'}/projects" style="background:#2563EB;color:#fff;padding:13px 26px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">View Project →</a>
    </div>
    <hr style="border:1px solid #E5E7EB;margin:24px 0 12px;">
    <p style="color:#9CA3AF;font-size:12px;">This is an automated message from TaskFlow. Do not reply to this email.</p>
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
export const sendProjectClientEmail = async (to, project, manager, assignedByName, baseUrl) => {
  try {
    if (!to) return;

    const startStr = project.startDate ? new Date(project.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
    const endStr = project.endDate ? new Date(project.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
    const statusColors = { PLANNING: '#6366F1', IN_PROGRESS: '#F59E0B', COMPLETED: '#10B981', ON_HOLD: '#6B7280' };
    const statusColor = statusColors[project.status] || '#6B7280';



    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: `Your Project Is Ready: ${project.name}`,
      text: `Hello,\n\nGreat news! The project "${project.name}" has been set up for you on TaskFlow.\n\nProject Details:\n- Status: ${project.status || 'PLANNING'}\n- Start Date: ${startStr}\n- End Date: ${endStr}\n- Description: ${project.description || 'No description provided'}\n\nYour Project Manager: ${manager ? `${manager.name} (${manager.email})` : 'Not assigned'}\n\nLog in to TaskFlow to track progress.\n\nBest regards,\nTaskFlow Team`,
      html: `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#1F2937;">
  <div style="background:linear-gradient(135deg,#059669,#10B981);padding:32px 28px;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;color:#fff;font-size:22px;">🚀 Your Project Is Live!</h1>
    <p style="color:#A7F3D0;margin:6px 0 0;">A new project has been set up for you.</p>
  </div>

  <div style="background:#F9FAFB;padding:28px;border-radius:0 0 12px 12px;border:1px solid #E5E7EB;">
    <p>Hello,</p>
    <p>Great news! The project <strong>${project.name}</strong> has been set up for you on TaskFlow${assignedByName ? ` by <strong>${assignedByName}</strong>` : ''}.</p>

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



    <div style="margin:28px 0 8px;">
      <a href="${baseUrl || process.env.CLIENT_URL || 'http://localhost:5173'}" style="background:#059669;color:#fff;padding:13px 26px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Track Your Project →</a>
    </div>
    <hr style="border:1px solid #E5E7EB;margin:24px 0 12px;">
    <p style="color:#9CA3AF;font-size:12px;">This is an automated message from TaskFlow. Do not reply to this email.</p>
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


export const sendUserApprovalEmail = async (to, userName, baseUrl) => {
  try {
    if (!to) return;

    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: 'Account Approved - Welcome to TaskFlow',
      text: `Hello ${userName},\n\nYour account has been approved by the administrator.\n\nYou can now log in to TaskFlow and access your dashboard.\n\nLogin here: ${baseUrl || process.env.CLIENT_URL || 'http://localhost:5173'}/login\n\nBest regards,\nTaskFlow Team`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Account Approved!</h2>
          <p>Hello <strong>${userName}</strong>,</p>
          <p>Great news! Your account has been approved by the administrator.</p>
          <p>You can now log in to TaskFlow and start collaborating.</p>
          <div style="margin: 30px 0;">
            <a href="${baseUrl || process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Login to TaskFlow</a>
          </div>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message from TaskFlow.</p>
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

export const sendOrgSignupEmail = async (to, userName, orgName) => {
  try {
    if (!to) return;

    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: 'Welcome to TaskFlow - Account Pending Approval',
      text: `Hello ${userName},\n\nThank you for signing up ${orgName} on TaskFlow.\n\nYour account has been created and is currently pending administrator approval. You will receive another email once your account is approved and ready to use.\n\nBest regards,\nTaskFlow Team`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to TaskFlow!</h2>
          <p>Hello <strong>${userName}</strong>,</p>
          <p>Thank you for registering <strong>${orgName}</strong> on TaskFlow.</p>
          <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #B45309;"><strong>Status: Pending Approval</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Your organization account is currently under review by our administrators. We will notify you via email as soon as it is approved.</p>
          </div>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message from TaskFlow.</p>
        </div>
      `,
    });

    console.log('Org Signup Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending org signup email:', error);
    return null;
  }
};

/**
 * Send an email notification when superadmin updates organization admin credentials.
 */
export const sendCredentialsUpdatedEmail = async (to, userName, newPassword, baseUrl) => {
  try {
    if (!to) return;

    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: 'Security Alert - Your TaskFlow Credentials Have Been Updated',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Credentials Updated</h2>
          <p>Hello <strong>${userName}</strong>,</p>
          <p>The administrator has updated your login credentials for TaskFlow.</p>
          <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0;"><strong>Email:</strong> ${to}</p>
            ${newPassword ? `<p style="margin: 8px 0 0 0;"><strong>New Password:</strong> ${newPassword}</p>` : ''}
          </div>
          <p>Please log in with these credentials. For your security, we strongly recommend changing your password directly within the platform if a temporary one was provided to you.</p>
          <div style="margin: 30px 0;">
            <a href="${baseUrl || process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Login Now</a>
          </div>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated security message from TaskFlow.</p>
        </div>
      `,
    });

    console.log('Credentials Updated Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending credentials updated email:', error);
    return null;
  }
};

/**
 * Send an email notification for a new support ticket.
 */
export const sendNewTicketNotification = async (to, ticketTitle, description, priority, clientName, ticketId, baseUrl) => {
  try {
    if (!to) return;

    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: `New Support Ticket: ${ticketTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Support Ticket</h2>
          <p>A new support ticket has been submitted by <strong>${clientName}</strong>.</p>
          <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <h3 style="margin-top: 0;">${ticketTitle}</h3>
            <p>${description}</p>
            <p style="margin-bottom: 0;"><strong>Priority:</strong> ${priority}</p>
          </div>
          <a href="${baseUrl || process.env.CLIENT_URL || 'http://localhost:5173'}/tickets/${ticketId}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View Ticket</a>
        </div>
      `,
    });
    return info;
  } catch (error) {
    console.error('Error sending new ticket email:', error);
    return null;
  }
};

/**
 * Send an email notification for ticket status update.
 */
export const sendTicketStatusUpdateNotification = async (to, ticketTitle, newStatus, updatedBy) => {
  try {
    if (!to) return;

    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: `Ticket Status Updated: ${ticketTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Ticket Status Updated</h2>
          <p>Your ticket "<strong>${ticketTitle}</strong>" has been updated to <strong>${newStatus}</strong> by ${updatedBy}.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Log in to TaskFlow to view more details.</p>
        </div>
      `,
    });
    return info;
  } catch (error) {
    console.error('Error sending ticket status update email:', error);
    return null;
  }
};

/**
 * Send an email notification for a new ticket comment.
 */
export const sendTicketCommentNotification = async (to, ticketTitle, commentAuthor, message, ticketId, baseUrl) => {
  try {
    if (!to) return;

    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: `New Comment on Ticket: ${ticketTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Comment</h2>
          <p><strong>${commentAuthor}</strong> added a comment to the ticket "<strong>${ticketTitle}</strong>":</p>
          <div style="background: #F9FAFB; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic;">
            "${message}"
          </div>
          <a href="${baseUrl || process.env.CLIENT_URL || 'http://localhost:5173'}/tickets/${ticketId}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reply on Ticket</a>
        </div>
      `,
    });
    return info;
  } catch (error) {
    console.error('Error sending ticket comment email:', error);
    return null;
  }
};
export const sendMemberInvitationEmail = async (to, userName, password, role, baseUrl) => {
  try {
    if (!to) return;

    const loginUrl = `${baseUrl || process.env.CLIENT_URL || 'http://localhost:5173'}/login`;

    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: 'Welcome to TaskFlow - Your Account Credentials',
      text: `Hello ${userName},\n\nYou have been added to TaskFlow as a ${role}.\n\nYour login credentials are:\nEmail: ${to}\nPassword: ${password}\n\nLogin here: ${loginUrl}\n\nPlease log in to set your new password and access your dashboard.\n\nBest regards,\nTaskFlow Team`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #2563eb; text-align: center;">Welcome to TaskFlow!</h2>
          <p>Hello <strong>${userName}</strong>,</p>
          <p>You have been added to the TaskFlow platform with the role of <strong>${role}</strong>.</p>
          
          <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin-top: 0; font-weight: bold; color: #374151;">Your Login Credentials:</p>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0; color: #6B7280; width: 100px;">Email:</td>
                <td style="padding: 5px 0; font-family: monospace;">${to}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Password:</td>
                <td style="padding: 5px 0; font-family: monospace;">${password}</td>
              </tr>
            </table>
          </div>


          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Login Page</a>
          </div>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #6B7280; font-size: 12px; text-align: center;">This is an automated message from TaskFlow. If you did not expect this, please ignore this email.</p>
        </div>
      `,
    });

    console.log('Invitation Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return null;
  }
};

/**
 * Send an email notification when a user is added to a manager's team
 */
export const sendTeamAssignmentEmail = async (to, userName, managerName, teamMembers = [], baseUrl) => {
  try {
    if (!to) return;

    const teamRows = teamMembers.length > 0
      ? teamMembers.map(m => `
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;">${m.name}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#6B7280;">${m.email}</td>
                </tr>`).join('')
      : '<tr><td colspan="2" style="padding:8px 12px;color:#9CA3AF;text-align:center;">You are the first member of this team!</td></tr>';

    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: `You have been added to ${managerName}'s Team`,
      text: `Hello ${userName},\n\nYou have been assigned to ${managerName}'s team on TaskFlow.\n\nTeam Members:\n${teamMembers.map(m => `- ${m.name} (${m.email})`).join('\n') || 'You are the first member!'}\n\nPlease log in to TaskFlow to view your team and tasks.\n\nBest regards,\nTaskFlow Team`,
      html: `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#1F2937;">
  <div style="background:linear-gradient(135deg,#8B5CF6,#6D28D9);padding:32px 28px;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;color:#fff;font-size:22px;">👋 Welcome to the Team!</h1>
    <p style="color:#DDD6FE;margin:6px 0 0;">You have been assigned to a new manager's team.</p>
  </div>

  <div style="background:#F9FAFB;padding:28px;border-radius:0 0 12px 12px;border:1px solid #E5E7EB;">
    <p>Hello <strong>${userName}</strong>,</p>
    <p>You have been assigned to <strong>${managerName}'s</strong> team on TaskFlow.</p>

    <!-- Team Members -->
    <h3 style="font-size:15px;margin:24px 0 10px;color:#374151;">👥 Your Team Members</h3>
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);">
      <thead>
        <tr style="background:#F3F4F6;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6B7280;text-transform:uppercase;">Name</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6B7280;text-transform:uppercase;">Email</th>
        </tr>
      </thead>
      <tbody>${teamRows}</tbody>
    </table>

    <div style="margin:28px 0 8px;">
      <a href="${baseUrl || process.env.CLIENT_URL || 'http://localhost:5173'}/team" style="background:#8B5CF6;color:#fff;padding:13px 26px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">View Team →</a>
    </div>
    <hr style="border:1px solid #E5E7EB;margin:24px 0 12px;">
    <p style="color:#9CA3AF;font-size:12px;">This is an automated message from TaskFlow. Do not reply to this email.</p>
  </div>
</div>`,
    });

    console.log('Team Assignment Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending team assignment email:', error);
    return null;
  }
};

/**
 * Send a password reset email.
 * @param {string} to - User's email
 * @param {string} userName - User's name
 * @param {string} resetLink - Link to reset password
 */
export const sendPasswordResetEmail = async (to, userName, resetLink) => {
  try {
    if (!to) return;

    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: 'Reset Your Password - TaskFlow',
      text: `Hello ${userName},\n\nYou requested to reset your password. Click the link below to set a new password:\n\n${resetLink}\n\nThis link will expire in 1 hour. If you did not request this, please ignore this email.\n\nBest regards,\nTaskFlow Team`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #2563eb; text-align: center;">Reset Your Password</h2>
          <p>Hello <strong>${userName}</strong>,</p>
          <p>You requested to reset your password for your TaskFlow account. Click the button below to set a new password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>

          <p style="color: #6B7280; font-size: 14px;">Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #2563eb; font-size: 12px;">${resetLink}</p>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #6B7280; font-size: 12px; text-align: center;">This link will expire in 1 hour. If you did not request this reset, please ignore this email.</p>
        </div>
      `,
    });

    console.log('Password Reset Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return null;
  }
};

/**
 * Send an email when a timesheet is submitted for approval.
 */
export const sendTimesheetSubmissionEmail = async (to, managerName, userName, projectName, hours, date, baseUrl) => {
  try {
    if (!to) return;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: `Timesheet Submitted: ${userName} - ${projectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #2563eb;">Timesheet Requires Approval</h2>
          <p>Hello <strong>${managerName}</strong>,</p>
          <p><strong>${userName}</strong> has submitted a time entry for the project <strong>${projectName}</strong> that requires your review.</p>
          <div style="background: #F9FAFB; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <p style="margin: 0;"><strong>Logged Hours:</strong> ${hours}h</p>
            <p style="margin: 5px 0 0 0;"><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
          </div>
          <a href="${baseUrl || process.env.CLIENT_URL || 'http://localhost:5173'}/timesheets" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Review Timesheet</a>
        </div>
      `,
    });
    return info;
  } catch (error) {
    console.error('Error sending timesheet submission email:', error);
    return null;
  }
};

/**
 * Send an email when a timesheet is approved or rejected.
 */
export const sendTimesheetStatusEmail = async (to, userName, projectName, status, managerName, hours, baseUrl) => {
  try {
    if (!to) return;
    const isApproved = status === 'APPROVED';
    const color = isApproved ? '#10B981' : '#EF4444';
    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: `Timesheet ${isApproved ? 'Approved' : 'Rejected'}: ${projectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: ${color};">Timesheet ${isApproved ? 'Approved' : 'Rejected'}</h2>
          <p>Hello <strong>${userName}</strong>,</p>
          <p>Your time entry of <strong>${hours}h</strong> for the project <strong>${projectName}</strong> has been <strong>${status.toLowerCase()}</strong> by ${managerName}.</p>
          <a href="${baseUrl || process.env.CLIENT_URL || 'http://localhost:5173'}/timesheets" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View Timesheets</a>
        </div>
      `,
    });
    return info;
  } catch (error) {
    console.error('Error sending timesheet status email:', error);
    return null;
  }
};

/**
 * Send an email notification to SuperAdmin when a new organization signs up.
 */
export const sendNewOrgSignupNotificationToSuperAdmin = async (superAdminEmail, superAdminName, orgDetails, adminDetails, baseUrl) => {
  try {
    if (!superAdminEmail) return;

    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to: superAdminEmail,
      subject: `New Organization Signup: ${orgDetails.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #2563eb;">🚀 New Organization Registered</h2>
          <p>Hello <strong>${superAdminName}</strong>,</p>
          <p>A new organization has just signed up on TaskFlow.</p>
          
          <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">Organization Details</h3>
            <p><strong>Name:</strong> ${orgDetails.name}</p>
            <p><strong>Industry:</strong> ${orgDetails.industry || 'Not specified'}</p>
            <p><strong>Size:</strong> ${orgDetails.size || 'Not specified'}</p>
            <p><strong>Country:</strong> ${orgDetails.country || 'Not specified'}</p>
            
            <h3 style="margin-top: 20px; color: #1f2937;">Admin Details</h3>
            <p><strong>Name:</strong> ${adminDetails.name}</p>
            <p><strong>Email:</strong> ${adminDetails.email}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl || process.env.CLIENT_URL || 'http://localhost:5173'}/superadmin/orgs" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Organization in Admin Panel</a>
          </div>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #6B7280; font-size: 12px; text-align: center;">This is an automated system notification from TaskFlow.</p>
        </div>
      `,
    });

    console.log('SuperAdmin Notification Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending superadmin notification email:', error);
    return null;
  }
};
