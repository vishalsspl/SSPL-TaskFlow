export const buildProjectReportHTML = (data) => {
    const {
        projectName = 'Project',
        clientName = 'Client',
        reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        projectManager = '-',
        totalTasks = 0,
        completedTasks = 0,
        inProgressTasks = 0,
        todoTasks = 0,
        sprints = [],
        teamMembers = [],
        recentActivity = [],
    } = data;

    const completionPercent = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const inProgressPercent = totalTasks ? Math.round((inProgressTasks / totalTasks) * 100) : 0;
    const todoPercent = totalTasks ? Math.round((todoTasks / totalTasks) * 100) : 0;

    const statusColor = {
        Completed: { bg: '#dcfce7', color: '#16a34a' },
        Active: { bg: '#dbeafe', color: '#2563eb' },
        Planned: { bg: '#fef9c3', color: '#a16207' },
        Blocked: { bg: '#fee2e2', color: '#dc2626' },
        'In Progress': { bg: '#dbeafe', color: '#2563eb' },
        'COMPLETED': { bg: '#dcfce7', color: '#16a34a' },
        'IN_PROGRESS': { bg: '#dbeafe', color: '#2563eb' },
        'TODO': { bg: '#f1f5f9', color: '#475569' },
        'WAITING': { bg: '#fef9c3', color: '#a16207' },
    };

    const badge = (status) => {
        const s = statusColor[status] || { bg: '#f1f5f9', color: '#475569' };
        return `<span style="background:${s.bg};color:${s.color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">${status}</span>`;
    };

    const sprintRows = sprints.map((s, i) => {
        const pct = s.totalTasks ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;
        return `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;color:#334155;font-weight:600;">${s.name}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;">${s.startDate}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;">${s.endDate}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;text-align:center;">${s.totalTasks}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;text-align:center;color:#16a34a;font-weight:600;">${s.completedTasks}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;background:#e2e8f0;border-radius:99px;height:7px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#16a34a,#4ade80);border-radius:99px;"></div>
            </div>
            <span style="font-size:12px;color:#64748b;min-width:32px;">${pct}%</span>
          </div>
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;">${badge(s.status)}</td>
      </tr>`;
    }).join('');

    const memberRows = teamMembers.map((m, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
      <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${m.name.charAt(0).toUpperCase()}
          </div>
          <span style="font-weight:600;color:#1e293b;">${m.name}</span>
        </div>
      </td>
      <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;">${m.role}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;text-align:center;color:#16a34a;font-weight:700;">${m.tasksCompleted}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;text-align:center;color:#2563eb;font-weight:700;">${m.tasksInProgress}</td>
    </tr>`).join('');

    const activityTypeColor = { feature: { bg: '#ede9fe', color: '#7c3aed' }, bug: { bg: '#fee2e2', color: '#dc2626' }, task: { bg: '#e0f2fe', color: '#0369a1' } };
    const activityRows = recentActivity.map((a, i) => {
        const t = activityTypeColor[a.type] || { bg: '#f1f5f9', color: '#475569' };
        return `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;white-space:nowrap;">${a.date}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b;">${a.user}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;color:#475569;">${a.action}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;">
          <span style="background:${t.bg};color:${t.color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">${a.type}</span>
        </td>
      </tr>`;
    }).join('');

    const thStyle = `style="background:#0f172a;color:white;padding:12px 14px;text-align:left;font-weight:600;font-size:12px;letter-spacing:0.4px;"`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#1e293b; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  @page { margin:0; size:A4; }
</style>
</head>
<body>

<!-- ═══════════════════════ COVER PAGE ═══════════════════════ -->
<div style="
  min-height:100vh;
  background:linear-gradient(145deg,#0f172a 0%,#1e3a5f 55%,#0c4a6e 100%);
  display:flex; flex-direction:column; justify-content:space-between;
  padding:64px 60px; color:white; position:relative; overflow:hidden;
  page-break-after:always;
">
  <!-- decorative circles -->
  <div style="position:absolute;top:-80px;right:-80px;width:420px;height:420px;background:rgba(14,165,233,0.12);border-radius:50%;"></div>
  <div style="position:absolute;bottom:-60px;left:-60px;width:300px;height:300px;background:rgba(99,102,241,0.1);border-radius:50%;"></div>

  <!-- top label -->
  <div style="position:relative;z-index:1;">
    <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;opacity:0.5;margin-bottom:12px;">Confidential Report</div>
    <div style="width:48px;height:3px;background:#0ea5e9;border-radius:2px;"></div>
  </div>

  <!-- center content -->
  <div style="position:relative;z-index:1;">
    <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#38bdf8;margin-bottom:20px;">Project Progress Report</div>
    <div style="font-size:52px;font-weight:800;line-height:1.15;margin-bottom:16px;">${projectName}</div>
    <div style="font-size:20px;opacity:0.65;margin-bottom:48px;">Prepared for ${clientName}</div>

    <!-- progress ring visual -->
    <div style="display:inline-flex;align-items:center;gap:24px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:20px 28px;">
      <div style="text-align:center;">
        <div style="font-size:42px;font-weight:800;color:#4ade80;">${completionPercent}%</div>
        <div style="font-size:12px;opacity:0.55;letter-spacing:1px;text-transform:uppercase;margin-top:4px;">Complete</div>
      </div>
      <div style="width:1px;height:50px;background:rgba(255,255,255,0.15);"></div>
      <div>
        <div style="font-size:13px;opacity:0.5;margin-bottom:8px;">Task Breakdown</div>
        <div style="display:flex;gap:16px;">
          <div><span style="font-size:18px;font-weight:700;color:#4ade80;">${completedTasks}</span> <span style="font-size:11px;opacity:0.5;">Done</span></div>
          <div><span style="font-size:18px;font-weight:700;color:#60a5fa;">${inProgressTasks}</span> <span style="font-size:11px;opacity:0.5;">Active</span></div>
          <div><span style="font-size:18px;font-weight:700;color:#fbbf24;">${todoTasks}</span> <span style="font-size:11px;opacity:0.5;">Todo</span></div>
        </div>
      </div>
    </div>
  </div>

  <!-- bottom meta strip -->
  <div style="position:relative;z-index:1;display:flex;gap:48px;border-top:1px solid rgba(255,255,255,0.15);padding-top:28px;">
    <div><div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;opacity:0.4;margin-bottom:6px;">Client</div><div style="font-size:15px;font-weight:600;">${clientName}</div></div>
    <div><div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;opacity:0.4;margin-bottom:6px;">Project Manager</div><div style="font-size:15px;font-weight:600;">${projectManager}</div></div>
    <div><div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;opacity:0.4;margin-bottom:6px;">Total Tasks</div><div style="font-size:15px;font-weight:600;">${totalTasks}</div></div>
    <div><div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;opacity:0.4;margin-bottom:6px;">Report Date</div><div style="font-size:15px;font-weight:600;">${reportDate}</div></div>
  </div>
</div>


<!-- ═══════════════════════ PAGE 2: OVERVIEW ═══════════════════════ -->
<div style="padding:48px 52px; page-break-after:always;">

  <!-- header -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;">
    <div>
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Section 01</div>
      <h2 style="font-size:24px;font-weight:800;color:#0f172a;">Project Overview</h2>
    </div>
    <span style="font-size:12px;background:#eff6ff;color:#2563eb;padding:6px 14px;border-radius:20px;font-weight:600;">${projectName}</span>
  </div>

  <!-- stat cards -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;">
    ${[
            { label: 'Total Tasks', value: totalTasks, sub: 'All sprints', accent: '#3b82f6', bg: '#eff6ff' },
            { label: 'Completed', value: completedTasks, sub: `${completionPercent}% done`, accent: '#22c55e', bg: '#f0fdf4' },
            { label: 'In Progress', value: inProgressTasks, sub: `${inProgressPercent}% active`, accent: '#f59e0b', bg: '#fffbeb' },
            { label: 'To Do', value: todoTasks, sub: `${todoPercent}% pending`, accent: '#64748b', bg: '#f8fafc' },
        ].map(c => `
      <div style="background:${c.bg};border-radius:14px;padding:22px;border-left:4px solid ${c.accent};">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;margin-bottom:8px;">${c.label}</div>
        <div style="font-size:36px;font-weight:800;color:#0f172a;line-height:1;">${c.value}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:6px;">${c.sub}</div>
      </div>`).join('')}
  </div>

  <!-- progress bars -->
  <div style="background:#f8fafc;border-radius:16px;padding:28px;margin-bottom:32px;">
    <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:20px;">Completion Breakdown</div>
    ${[
            { label: 'Completed', pct: completionPercent, grad: 'linear-gradient(90deg,#16a34a,#4ade80)' },
            { label: 'In Progress', pct: inProgressPercent, grad: 'linear-gradient(90deg,#2563eb,#60a5fa)' },
            { label: 'To Do', pct: todoPercent, grad: 'linear-gradient(90deg,#d97706,#fbbf24)' },
        ].map(p => `
      <div style="margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#475569;margin-bottom:7px;">
          <span>${p.label}</span><span style="font-weight:600;">${p.pct}%</span>
        </div>
        <div style="background:#e2e8f0;border-radius:99px;height:10px;overflow:hidden;">
          <div style="width:${p.pct}%;height:100%;background:${p.grad};border-radius:99px;"></div>
        </div>
      </div>`).join('')}
  </div>

  <!-- sprint table -->
  <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:14px;">Sprint Summary</div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead>
      <tr>
        <th ${thStyle} style="border-radius:8px 0 0 0;">Sprint</th>
        <th ${thStyle}>Start</th>
        <th ${thStyle}>End</th>
        <th ${thStyle} style="text-align:center;">Total</th>
        <th ${thStyle} style="text-align:center;">Done</th>
        <th ${thStyle}>Progress</th>
        <th ${thStyle} style="border-radius:0 8px 0 0;">Status</th>
      </tr>
    </thead>
    <tbody>${sprintRows}</tbody>
  </table>

  <!-- footer -->
  <div style="margin-top:40px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;">
    <span>${projectName} · Confidential</span><span>Page 2 · Generated ${reportDate}</span>
  </div>
</div>


<!-- ═══════════════════════ PAGE 3: TEAM + ACTIVITY ═══════════════════════ -->
<div style="padding:48px 52px;">

  <!-- header -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;">
    <div>
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Section 02</div>
      <h2 style="font-size:24px;font-weight:800;color:#0f172a;">Team & Activity</h2>
    </div>
    <span style="font-size:12px;background:#eff6ff;color:#2563eb;padding:6px 14px;border-radius:20px;font-weight:600;">${projectName}</span>
  </div>

  <!-- team table -->
  <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:14px;">Team Members</div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:36px;">
    <thead>
      <tr>
        <th ${thStyle} style="border-radius:8px 0 0 0;">Member</th>
        <th ${thStyle}>Role</th>
        <th ${thStyle} style="text-align:center;">Completed</th>
        <th ${thStyle} style="text-align:center;border-radius:0 8px 0 0;">In Progress</th>
      </tr>
    </thead>
    <tbody>${memberRows}</tbody>
  </table>

  <!-- activity table -->
  <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:14px;">Recent Activity</div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead>
      <tr>
        <th ${thStyle} style="border-radius:8px 0 0 0;">Date</th>
        <th ${thStyle}>User</th>
        <th ${thStyle}>Action</th>
        <th ${thStyle} style="border-radius:0 8px 0 0;">Type</th>
      </tr>
    </thead>
    <tbody>${activityRows}</tbody>
  </table>

  <!-- footer -->
  <div style="margin-top:40px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;">
    <span>${projectName} · Confidential</span><span>Page 3 of 3</span>
  </div>
</div>

</body>
</html>`;
};
