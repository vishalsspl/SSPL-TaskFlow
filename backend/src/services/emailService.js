import nodemailer from 'nodemailer';

console.log(`[EmailService] Initializing transporter for host: ${process.env.SMTP_HOST || 'smtp.ethereal.email'}`);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    ciphers: 'TLSv1.2',
    rejectUnauthorized: false
  },
  requireTLS: true
});

const DEFAULT_FROM = `"${process.env.SMTP_FROM_NAME || 'TaskFlow'}" <${process.env.SMTP_USER}>`;
const getBaseUrl = (baseUrl) => baseUrl || process.env.CLIENT_URL || 'http://localhost:5173';

// ─────────────────────────────────────────────────────────────────────────────
// Jira-Style Email Template Engine
// ─────────────────────────────────────────────────────────────────────────────

const buildEmailTemplate = ({ actionSummary, refLabel, refTitle, bodyLines, fields, ctaUrl, ctaLabel, footerNote }) => {

  // Build fields as simple "Label :  Value" rows (Jira-style)
  const fieldsBlock = (fields && fields.length > 0) ? `
    <table cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 0;width:100%;">
      ${fields.map(f => `
        <tr>
          <td style="padding:5px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#707070;width:160px;vertical-align:top;white-space:nowrap;">${f.label} :</td>
          <td style="padding:5px 0 5px 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;vertical-align:top;word-break:break-word;">${f.value}</td>
        </tr>
      `).join('')}
    </table>
  ` : '';

  // Build body paragraphs
  const bodyHtml = (bodyLines || []).map(line =>
    `<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#333333;">${line}</p>`
  ).join('');

  // CTA as a simple blue link (not a button — matches Jira style)
  const ctaBlock = ctaUrl ? `
    <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
      <a href="${ctaUrl}" target="_blank" style="color:#0052CC;text-decoration:none;font-weight:600;">${ctaLabel || 'View Details'}</a>
    </p>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>TaskFlow Notification</title>
  <!--[if !mso]><!-->
  <style type="text/css">
    @media only screen and (max-width: 620px) {
      .email-outer { padding: 8px !important; }
      .email-inner { padding: 16px 0 0 !important; }
    }
  </style>
  <!--<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#ffffff;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td class="email-outer" style="padding:20px;">
        <table cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Action Summary Line -->
          <tr>
            <td style="padding:0 0 12px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;">${actionSummary || ''}</p>
            </td>
          </tr>

          <!-- Thin Separator -->
          <tr><td style="border-bottom:1px solid #cccccc;height:1px;padding:0;"></td></tr>

          <!-- Reference Label + Clickable Title (like Jira project/ticket header) -->
          ${refLabel || refTitle ? `
          <tr>
            <td style="padding:16px 0 0;">
              ${refLabel ? `<p style="margin:0 0 2px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#707070;">${refLabel}</p>` : ''}
              ${refTitle ? `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;color:#0052CC;font-weight:400;line-height:24px;">${ctaUrl ? `<a href="${ctaUrl}" style="color:#0052CC;text-decoration:none;">${refTitle}</a>` : refTitle}</p>` : ''}
            </td>
          </tr>
          ` : ''}

          <!-- Body Content + Fields + CTA Link -->
          <tr>
            <td class="email-inner" style="padding:20px 0 0;">
              ${bodyHtml}
              ${fieldsBlock}
              ${ctaBlock}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;">
              <hr style="border:0;border-top:1px solid #e0e0e0;margin:0 0 12px;">
              ${footerNote ? `<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#999999;">${footerNote}</p>` : ''}
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#999999;">This message was sent by TaskFlow. Do not reply to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};


// ─────────────────────────────────────────────────────────────────────────────
// Email Functions
// ─────────────────────────────────────────────────────────────────────────────

export const sendManagerTaskCreatedEmail = async (to, managerName, memberName, taskTitle, projectName, baseUrl) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] New Task Created by ${memberName}`,
      html: buildEmailTemplate({
        actionSummary: `<strong>${memberName}</strong> has created a new task.`,
        refLabel: `TaskFlow / ${projectName}`,
        refTitle: taskTitle,
        bodyLines: [
          `Hi ${managerName},`,
          `<strong>${memberName}</strong> has created a new task in <strong>${projectName}</strong>.`
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/task-board`,
        ctaLabel: 'View Task Board'
      }),
    });
    console.log(`[EmailService] Manager Task Created Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending manager task created email to ${to}:`, error);
    return null;
  }
};

export const sendDocumentUploadedEmail = async (to, userName, documentTitle, projectName, uploaderName, baseUrl) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] New Document: ${documentTitle}`,
      html: buildEmailTemplate({
        actionSummary: `<strong>${uploaderName}</strong> has uploaded a new document.`,
        refLabel: `TaskFlow / ${projectName}`,
        refTitle: documentTitle,
        bodyLines: [
          `Hi ${userName},`,
          `A new document has been added to <strong>${projectName}</strong> by <strong>${uploaderName}</strong>.`
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/projects`, // You can also link specifically to the project tab if available
        ctaLabel: 'View Documents'
      }),
    });
    console.log(`[EmailService] Document Uploaded Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending document uploaded email to ${to}:`, error);
    return null;
  }
};

export const sendTaskAssignmentEmail = async (to, taskTitle, projectName, assignedByName, { priority, dueDate, status, description, baseUrl } = {}) => {
  try {
    if (!to) return null;
    const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set';
    const statusStr = status ? status.replace(/_/g, ' ') : 'TODO';
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] (${projectName}) Task Assigned: ${taskTitle}`,
      html: buildEmailTemplate({
        actionSummary: `<strong>${assignedByName}</strong> assigned a task to you.`,
        refLabel: `TaskFlow / ${projectName}`,
        refTitle: taskTitle,
        fields: [
          { label: 'Priority', value: priority || 'MEDIUM' },
          { label: 'Status', value: statusStr },
          { label: 'Due Date', value: dueDateStr },
          ...(description ? [{ label: 'Description', value: description }] : [])
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/tasks`,
        ctaLabel: 'View this task in TaskFlow'
      }),
    });
    console.log(`[EmailService] Task Assignment Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending task assignment email to ${to}:`, error);
    return null;
  }
};

export const sendTaskStatusUpdateEmail = async (to, taskTitle, projectName, newStatus, updatedBy, assignedByName, baseUrl) => {
  try {
    if (!to) return null;
    const statusStr = newStatus.replace(/_/g, ' ');
    const isApproval = newStatus.toLowerCase().includes('approved');
    
    const subject = isApproval 
      ? `[TaskFlow] (${projectName}) Task Approved by ${updatedBy}: ${taskTitle}`
      : `[TaskFlow] (${projectName}) Status Updated: ${taskTitle}`;
      
    const actionSummary = isApproval 
      ? `<strong>${updatedBy}</strong> approved your task.`
      : `<strong>${updatedBy}</strong> updated the status of a task.`;

    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject,
      html: buildEmailTemplate({
        actionSummary,
        refLabel: `TaskFlow / ${projectName}`,
        refTitle: taskTitle,
        fields: [
          { label: 'Status', value: statusStr },
          ...(assignedByName ? [{ label: 'Assigned By', value: assignedByName }] : [])
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/tasks`,
        ctaLabel: 'View this task in TaskFlow'
      }),
    });
    console.log(`[EmailService] Task Status Update Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending task status update email to ${to}:`, error);
    return null;
  }
};

export const sendTaskUpdateEmail = async (to, taskTitle, projectName, updatedByName, { priority, dueDate, status, description, baseUrl } = {}) => {
  try {
    if (!to) return null;
    const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set';
    const statusStr = status ? status.replace(/_/g, ' ') : 'TODO';
    
    const isApproval = status === 'COMPLETED' || status === 'DONE' || (statusStr && statusStr.toLowerCase().includes('approved'));
    
    const subject = isApproval 
      ? `[TaskFlow] (${projectName}) Task Approved by ${updatedByName}: ${taskTitle}`
      : `[TaskFlow] (${projectName}) Task Updated: ${taskTitle}`;
      
    const actionSummary = isApproval 
      ? `<strong>${updatedByName}</strong> approved a task assigned to you.`
      : `<strong>${updatedByName}</strong> updated a task assigned to you.`;

    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject,
      html: buildEmailTemplate({
        actionSummary,
        refLabel: `TaskFlow / ${projectName}`,
        refTitle: taskTitle,
        fields: [
          { label: 'Priority', value: priority || 'MEDIUM' },
          { label: 'Status', value: statusStr },
          { label: 'Due Date', value: dueDateStr },
          ...(description ? [{ label: 'Description', value: description }] : [])
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/tasks`,
        ctaLabel: 'View this task in TaskFlow'
      }),
    });
    console.log(`[EmailService] Task Update Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending task update email to ${to}:`, error);
    return null;
  }
};

export const sendTaskDeleteEmail = async (to, taskTitle, projectName, deletedByName) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] (${projectName}) Task Deleted: ${taskTitle}`,
      html: buildEmailTemplate({
        actionSummary: `<strong>${deletedByName}</strong> deleted a task that was assigned to you.`,
        refLabel: `TaskFlow / ${projectName}`,
        refTitle: taskTitle,
        bodyLines: [
          `The task <strong>${taskTitle}</strong> has been deleted from TaskFlow.`,
          `If you believe this was a mistake, please contact your manager.`
        ],
      }),
    });
    console.log(`[EmailService] Task Delete Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending task delete email to ${to}:`, error);
    return null;
  }
};

export const sendProjectManagerEmail = async (to, project, manager, client, assignedByName, baseUrl) => {
  try {
    if (!to) return null;
    const startStr = project.startDate ? new Date(project.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
    const endStr = project.endDate ? new Date(project.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
    const budgetStr = project.totalBudget ? `INR ${Number(project.totalBudget).toLocaleString('en-IN')}` : 'Not specified';
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] Project Assigned: ${project.name}`,
      html: buildEmailTemplate({
        actionSummary: `<strong>${assignedByName}</strong> assigned you as Project Manager.`,
        refLabel: `TaskFlow / Projects`,
        refTitle: project.name,
        bodyLines: [
          `Hi ${manager.name},`,
          `<strong>${assignedByName}</strong> has assigned you as the Project Manager for the project <strong>${project.name}</strong>.`
        ],
        fields: [
          { label: 'Status', value: project.status || 'PLANNING' },
          { label: 'Start Date', value: startStr },
          { label: 'End Date', value: endStr },
          { label: 'Budget', value: budgetStr },
          { label: 'Client', value: client ? client.name : 'Not assigned' },
          ...(project.description ? [{ label: 'Description', value: project.description }] : [])
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/projects`,
        ctaLabel: 'View this project in TaskFlow'
      }),
    });
    console.log(`[EmailService] Project Manager Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending project manager email to ${to}:`, error);
    return null;
  }
};

export const sendProjectUpdateEmail = async (to, project, assignedByName, baseUrl) => {
  try {
    if (!to) return null;
    const startStr = project.startDate ? new Date(project.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
    const endStr = project.endDate ? new Date(project.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
    const budgetStr = project.totalBudget ? `INR ${Number(project.totalBudget).toLocaleString('en-IN')}` : 'Not specified';
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] Project Updated: ${project.name}`,
      html: buildEmailTemplate({
        actionSummary: `<strong>${assignedByName}</strong> updated a project you manage.`,
        refLabel: `TaskFlow / Projects`,
        refTitle: project.name,
        bodyLines: [
          `The project <strong>${project.name}</strong> has been updated by <strong>${assignedByName}</strong>.`
        ],
        fields: [
          { label: 'Status', value: project.status || 'PLANNING' },
          { label: 'Start Date', value: startStr },
          { label: 'End Date', value: endStr },
          { label: 'Budget', value: budgetStr },
          ...(project.description ? [{ label: 'Description', value: project.description }] : [])
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/projects`,
        ctaLabel: 'View this project in TaskFlow'
      }),
    });
    console.log(`[EmailService] Project Update Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending project update email to ${to}:`, error);
    return null;
  }
};

export const sendProjectDeleteEmail = async (to, projectName, assignedByName) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] Project Deleted: ${projectName}`,
      html: buildEmailTemplate({
        actionSummary: `<strong>${assignedByName}</strong> deleted a project you were managing.`,
        refLabel: `TaskFlow / Projects`,
        refTitle: projectName,
        bodyLines: [
          `The project <strong>${projectName}</strong> has been deleted from TaskFlow.`,
          `If you believe this was a mistake, please contact your administrator.`
        ],
      }),
    });
    console.log(`[EmailService] Project Delete Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending project delete email to ${to}:`, error);
    return null;
  }
};

export const sendProjectClientEmail = async (to, project, manager, assignedByName, baseUrl) => {
  try {
    if (!to) return null;
    const startStr = project.startDate ? new Date(project.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
    const endStr = project.endDate ? new Date(project.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] Your Project Is Ready: ${project.name}`,
      html: buildEmailTemplate({
        actionSummary: `${assignedByName ? `<strong>${assignedByName}</strong> configured` : 'A'} project for you.`,
        refLabel: `TaskFlow / Projects`,
        refTitle: project.name,
        bodyLines: [
          'Hello,',
          `You have been assigned as the Client for the project <strong>${project.name}</strong>.`
        ],
        fields: [
          { label: 'Status', value: project.status || 'PLANNING' },
          { label: 'Start Date', value: startStr },
          { label: 'End Date', value: endStr },
          { label: 'Project Manager', value: manager ? `${manager.name} (${manager.email})` : 'Not assigned' },
          ...(project.description ? [{ label: 'Description', value: project.description }] : [])
        ],
        ctaUrl: getBaseUrl(baseUrl),
        ctaLabel: 'View this project in TaskFlow'
      }),
    });
    console.log(`[EmailService] Client Project Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending client project email to ${to}:`, error);
    return null;
  }
};

export const sendProjectAssignmentEmail = sendProjectManagerEmail;

export const sendUserApprovalEmail = async (to, userName, baseUrl) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: '[TaskFlow] Your Account Has Been Approved',
      html: buildEmailTemplate({
        actionSummary: `Your TaskFlow account has been approved.`,
        refLabel: 'TaskFlow / Account',
        refTitle: 'Account Approved',
        bodyLines: [
          `Hello ${userName},`,
          `Your account has been approved by the administrator. You can now log in and access your dashboard.`
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/login`,
        ctaLabel: 'Log in to TaskFlow'
      }),
    });
    console.log(`[EmailService] Approval Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending approval email to ${to}:`, error);
    return null;
  }
};

export const sendUserRejectionEmail = async (to, userName) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: '[TaskFlow] Registration Update',
      html: buildEmailTemplate({
        actionSummary: `An update regarding your registration request.`,
        refLabel: 'TaskFlow / Account',
        refTitle: 'Registration Declined',
        bodyLines: [
          `Hello ${userName},`,
          `Thank you for your interest in TaskFlow. We regret to inform you that your registration request has been declined at this time.`,
          `If you believe this was a mistake, please contact your organization's administrator.`
        ],
        footerNote: 'If you have any questions, please reach out to your organization administrator.'
      }),
    });
    console.log(`[EmailService] Rejection Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending rejection email to ${to}:`, error);
    return null;
  }
};

export const sendOrgSignupEmail = async (to, userName, orgName) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] Registration Received: ${orgName}`,
      html: buildEmailTemplate({
        actionSummary: `Your registration with ${orgName} has been received.`,
        refLabel: 'TaskFlow / Account',
        refTitle: 'Pending Approval',
        bodyLines: [
          `Hello ${userName},`,
          `Thank you for registering with <strong>${orgName}</strong> on TaskFlow.`,
          `Your account is currently under review. You will receive a confirmation email once approved.`
        ],
        footerNote: 'No action is required from you at this time.'
      }),
    });
    console.log(`[EmailService] Org Signup Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending org signup email to ${to}:`, error);
    return null;
  }
};

export const sendCredentialsUpdatedEmail = async (to, userName, newPassword, baseUrl) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: '[TaskFlow] Security Alert: Credentials Updated',
      html: buildEmailTemplate({
        actionSummary: `Your login credentials have been updated by an administrator.`,
        refLabel: 'TaskFlow / Security',
        refTitle: 'Credentials Updated',
        bodyLines: [
          `Hello ${userName},`,
          `Please use the credentials below to log in. We recommend changing your password after logging in.`
        ],
        fields: [
          { label: 'Email', value: to },
          ...(newPassword ? [{ label: 'New Password', value: newPassword }] : [])
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/login`,
        ctaLabel: 'Log in to TaskFlow',
        footerNote: 'If you did not expect this change, please contact your administrator immediately.'
      }),
    });
    console.log(`[EmailService] Credentials Updated Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending credentials updated email to ${to}:`, error);
    return null;
  }
};

export const sendNewTicketNotification = async (to, ticketTitle, description, priority, clientName, ticketId, baseUrl) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] New Support Ticket: ${ticketTitle}`,
      html: buildEmailTemplate({
        actionSummary: `<strong>${clientName}</strong> created a new support ticket.`,
        refLabel: 'TaskFlow / Support Tickets',
        refTitle: ticketTitle,
        fields: [
          { label: 'Submitted By', value: clientName },
          { label: 'Priority', value: priority },
          { label: 'Description', value: description }
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/tickets/${ticketId}`,
        ctaLabel: 'View this ticket in TaskFlow'
      }),
    });
    console.log(`[EmailService] New Ticket Notification Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending new ticket notification email to ${to}:`, error);
    return null;
  }
};

export const sendTicketStatusUpdateNotification = async (to, ticketTitle, newStatus, updatedBy) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] Ticket Updated: ${ticketTitle}`,
      html: buildEmailTemplate({
        actionSummary: `<strong>${updatedBy}</strong> updated a support ticket.`,
        refLabel: 'TaskFlow / Support Tickets',
        refTitle: ticketTitle,
        fields: [
          { label: 'New Status', value: newStatus },
          { label: 'Updated By', value: updatedBy }
        ]
      }),
    });
    console.log(`[EmailService] Ticket Status Update Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending ticket status update email to ${to}:`, error);
    return null;
  }
};

export const sendTaskCommentEmail = async (to, taskTitle, commentAuthor, message, projectId, taskId, baseUrl) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] New Comment on Task: ${taskTitle}`,
      html: buildEmailTemplate({
        actionSummary: `<strong>${commentAuthor}</strong> added a comment.`,
        refLabel: 'TaskFlow / Tasks',
        refTitle: taskTitle,
        bodyLines: [`"${message}"`],
        ctaUrl: `${getBaseUrl(baseUrl)}/task-board?project=${projectId}&highlight=${taskId}`,
        ctaLabel: 'View Task'
      }),
    });
    console.log(`[EmailService] Task Comment Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending task comment email to ${to}:`, error);
    return null;
  }
};

export const sendTicketCommentNotification = async (to, ticketTitle, commentAuthor, message, ticketId, baseUrl) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] New Comment on: ${ticketTitle}`,
      html: buildEmailTemplate({
        actionSummary: `<strong>${commentAuthor}</strong> added a comment.`,
        refLabel: 'TaskFlow / Support Tickets',
        refTitle: ticketTitle,
        bodyLines: [`"${message}"`],
        ctaUrl: `${getBaseUrl(baseUrl)}/tickets/${ticketId}`,
        ctaLabel: 'Reply on this ticket'
      }),
    });
    console.log(`[EmailService] Ticket Comment Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending ticket comment email to ${to}:`, error);
    return null;
  }
};

export const sendMemberInvitationEmail = async (to, userName, password, role, baseUrl) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: '[TaskFlow] You Have Been Invited',
      html: buildEmailTemplate({
        actionSummary: `You have been added to TaskFlow.`,
        refLabel: 'TaskFlow / Account',
        refTitle: 'Welcome to TaskFlow',
        bodyLines: [
          `Hello ${userName},`,
          `You have been added to the platform with the role of <strong>${role}</strong>. Use the credentials below to log in.`
        ],
        fields: [
          { label: 'Email', value: to },
          { label: 'Password', value: password },
          { label: 'Role', value: role }
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/login`,
        ctaLabel: 'Log in to TaskFlow',
        footerNote: 'If you did not expect this invitation, you can safely ignore this email.'
      }),
    });
    console.log(`[EmailService] Invitation Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending invitation email to ${to}:`, error);
    return null;
  }
};

export const sendRoleChangeEmail = async (to, userName, newRole, baseUrl) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: '[TaskFlow] Your Role Has Been Updated',
      html: buildEmailTemplate({
        actionSummary: `Your account role has been updated by an administrator.`,
        refLabel: 'TaskFlow / Account',
        refTitle: 'Role Updated',
        bodyLines: [
          `Hello ${userName},`,
          `Your permissions have been changed. Please log in to review your updated access.`
        ],
        fields: [{ label: 'New Role', value: newRole }],
        ctaUrl: `${getBaseUrl(baseUrl)}/login`,
        ctaLabel: 'Log in to TaskFlow',
        footerNote: 'If you believe this change was made in error, please contact your administrator.'
      }),
    });
    console.log(`[EmailService] Role change email sent to ${to}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Failed to send role change email to ${to}:`, error);
    return null;
  }
};

export const sendTeamAssignmentEmail = async (to, userName, managerName, teamMembers = [], baseUrl) => {
  try {
    if (!to) return null;
    const teamList = teamMembers.length > 0
      ? teamMembers.map(m => `${m.name} - ${m.email}`).join('<br>')
      : 'You are the first member of this team.';
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] Team Assignment: ${managerName}'s Team`,
      html: buildEmailTemplate({
        actionSummary: `You have been assigned to <strong>${managerName}'s</strong> team.`,
        refLabel: 'TaskFlow / Team',
        refTitle: `${managerName}'s Team`,
        bodyLines: [`Hello ${userName},`],
        fields: [
          { label: 'Manager', value: managerName },
          { label: 'Team Members', value: teamList }
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/team`,
        ctaLabel: 'View your team in TaskFlow'
      }),
    });
    console.log(`[EmailService] Team Assignment Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending team assignment email to ${to}:`, error);
    return null;
  }
};

export const sendProjectMemberAssignmentEmail = async (to, userName, projectName, projectDescription, managerName, baseUrl) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] Added to Project: ${projectName}`,
      html: buildEmailTemplate({
        actionSummary: `<strong>${managerName}</strong> added you to a project.`,
        refLabel: 'TaskFlow / Projects',
        refTitle: projectName,
        bodyLines: [
          `Hello ${userName},`,
          `You have been added as a member. You can now view and contribute to this project.`
        ],
        fields: [
          ...(projectDescription ? [{ label: 'Description', value: projectDescription }] : [])
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/projects`,
        ctaLabel: 'View this project in TaskFlow'
      }),
    });
    console.log(`[EmailService] Project Member Assignment Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending project member email to ${to}:`, error);
    return null;
  }
};

export const sendPasswordResetEmail = async (to, userName, resetLink) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: '[TaskFlow] Password Reset Request',
      html: buildEmailTemplate({
        actionSummary: `A password reset was requested for your account.`,
        refLabel: 'TaskFlow / Security',
        refTitle: 'Password Reset',
        bodyLines: [
          `Hello ${userName},`,
          `We received a request to reset your password. Click the link below to set a new password. This link will expire in 1 hour.`,
          `If you did not request this reset, you can safely ignore this email.`
        ],
        ctaUrl: resetLink,
        ctaLabel: 'Reset your password',
        footerNote: 'If you did not request a password reset, no action is required.'
      }),
    });
    console.log(`[EmailService] Password Reset Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending password reset email to ${to}:`, error);
    return null;
  }
};

export const sendTimesheetSubmissionEmail = async (to, managerName, userName, projectName, hours, date, baseUrl) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] Timesheet Pending Review: ${userName}`,
      html: buildEmailTemplate({
        actionSummary: `<strong>${userName}</strong> submitted a timesheet for review.`,
        refLabel: `TaskFlow / ${projectName}`,
        refTitle: `Timesheet: ${userName}`,
        bodyLines: [`Hello ${managerName},`],
        fields: [
          { label: 'Submitted By', value: userName },
          { label: 'Project', value: projectName },
          { label: 'Hours Logged', value: `${hours}h` },
          { label: 'Date', value: new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/timesheets`,
        ctaLabel: 'Review this timesheet in TaskFlow'
      }),
    });
    console.log(`[EmailService] Timesheet Submission Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending timesheet submission email to ${to}:`, error);
    return null;
  }
};

export const sendLeaveSubmissionEmail = async (to, managerName, userName, leaveType, hours, date, baseUrl) => {
  try {
    if (!to) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] Leave Application: ${userName}`,
      html: buildEmailTemplate({
        actionSummary: `<strong>${userName}</strong> submitted a leave application.`,
        refLabel: 'TaskFlow / Leave',
        refTitle: `Leave Application: ${userName}`,
        bodyLines: [`Hello ${managerName},`],
        fields: [
          { label: 'Submitted By', value: userName },
          { label: 'Leave Type', value: leaveType },
          { label: 'Hours', value: `${hours}h` },
          { label: 'Date', value: new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/timesheets`,
        ctaLabel: 'Review this application in TaskFlow'
      }),
    });
    console.log(`[EmailService] Leave Submission Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending leave submission email to ${to}:`, error);
    return null;
  }
};

export const sendTimesheetStatusEmail = async (to, userName, projectName, status, managerName, hours, baseUrl) => {
  try {
    if (!to) return null;
    const isApproved = status === 'APPROVED';
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] Timesheet ${isApproved ? 'Approved' : 'Rejected'}: ${projectName}`,
      html: buildEmailTemplate({
        actionSummary: `<strong>${managerName}</strong> ${isApproved ? 'approved' : 'rejected'} your timesheet.`,
        refLabel: `TaskFlow / ${projectName}`,
        refTitle: `Timesheet ${isApproved ? 'Approved' : 'Rejected'}`,
        bodyLines: [
          `Hello ${userName},`,
          `Your time entry of <strong>${hours}h</strong> for the project <strong>${projectName}</strong> has been <strong>${status.toLowerCase()}</strong>.`
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/timesheets`,
        ctaLabel: 'View your timesheets in TaskFlow'
      }),
    });
    console.log(`[EmailService] Timesheet Status Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending timesheet status email to ${to}:`, error);
    return null;
  }
};

export const sendLeaveStatusEmail = async (to, userName, leaveType, status, managerName, hours, baseUrl) => {
  try {
    if (!to) return null;
    const isApproved = status === 'APPROVED';
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to,
      subject: `[TaskFlow] Leave ${isApproved ? 'Approved' : 'Rejected'}`,
      html: buildEmailTemplate({
        actionSummary: `<strong>${managerName}</strong> ${isApproved ? 'approved' : 'rejected'} your leave request.`,
        refLabel: `TaskFlow / Leave`,
        refTitle: `Leave ${isApproved ? 'Approved' : 'Rejected'}`,
        bodyLines: [
          `Hello ${userName},`,
          `Your leave request of <strong>${hours}h</strong> for <strong>${leaveType}</strong> has been <strong>${status.toLowerCase()}</strong>.`
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/timesheets`,
        ctaLabel: 'View your timesheets in TaskFlow'
      }),
    });
    console.log(`[EmailService] Leave Status Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending leave status email to ${to}:`, error);
    return null;
  }
};

export const sendNewOrgSignupNotificationToSuperAdmin = async (superAdminEmail, superAdminName, orgDetails, adminDetails, baseUrl) => {
  try {
    if (!superAdminEmail) return null;
    const info = await transporter.sendMail({
      from: DEFAULT_FROM, to: superAdminEmail,
      subject: `[TaskFlow] New Organization Signup: ${orgDetails.name}`,
      html: buildEmailTemplate({
        actionSummary: `A new organization has registered on the platform.`,
        refLabel: 'TaskFlow / Admin',
        refTitle: orgDetails.name,
        bodyLines: [`Hello ${superAdminName},`],
        fields: [
          { label: 'Organization', value: orgDetails.name },
          { label: 'Industry', value: orgDetails.industry || 'Not specified' },
          { label: 'Size', value: orgDetails.size || 'Not specified' },
          { label: 'Country', value: orgDetails.country || 'Not specified' },
          { label: 'Admin Name', value: adminDetails.name },
          { label: 'Admin Email', value: adminDetails.email }
        ],
        ctaUrl: `${getBaseUrl(baseUrl)}/superadmin/orgs`,
        ctaLabel: 'View in admin panel'
      }),
    });
    console.log(`[EmailService] SuperAdmin Notification Email sent to ${superAdminEmail}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Error sending superadmin notification email:`, error);
    return null;
  }
};
