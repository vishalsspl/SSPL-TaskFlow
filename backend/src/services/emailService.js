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

export const sendTaskAssignmentEmail = async (to, taskTitle, projectName, assignedByKey) => {
    try {
        if (!to) return;

        const info = await transporter.sendMail({
            from: '"TasFlow Notification" <noreply@tasflow.com>', // sender address
            to, // list of receivers
            subject: `New Task Assigned: ${taskTitle}`, // Subject line
            text: `Hello,\n\nYou have been assigned a new task "${taskTitle}" in project "${projectName}" by ${assignedByKey}.\n\nPlease log in to TasFlow to view the details.\n\nBest regards,\nTasFlow Team`, // plain text body
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">New Task Assignment</h2>
          <p>Hello,</p>
          <p>You have been assigned a new task <strong>"${taskTitle}"</strong> in project <strong>"${projectName}"</strong> by <strong>${assignedByKey}</strong>.</p>
          <p>Please log in to your dashboard to view the details and start working.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message from TasFlow.</p>
        </div>
      `, // html body
        });

        console.log('Message sent: %s', info.messageId);
        // Preview only available when sending through an Ethereal account
        if (nodemailer.getTestMessageUrl(info)) {
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        // Don't throw error to prevent blocking task creation/update
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
