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

export const sendProjectAssignmentEmail = async (to, projectName, senderName) => {
    try {
        if (!to) return;

        const info = await transporter.sendMail({
            from: '"TasFlow Notification" <noreply@tasflow.com>',
            to,
            subject: `New Project Assigned: ${projectName}`,
            text: `Hello,\n\nYou have been assigned as the Manager for a new project "${projectName}" by ${senderName}.\n\nPlease log in to TasFlow to view the details.\n\nBest regards,\nTasFlow Team`,
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">New Project Assignment</h2>
          <p>Hello,</p>
          <p>You have been assigned as the Manager for a new project <strong>"${projectName}"</strong> by <strong>${senderName}</strong>.</p>
          <p>Please log in to your dashboard to view the details and start planning.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message from TasFlow.</p>
        </div>
      `,
        });

        console.log('Project Email sent: %s', info.messageId);
        if (nodemailer.getTestMessageUrl(info)) {
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        return null;
    }
};

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
