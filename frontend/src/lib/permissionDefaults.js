export const PERMISSION_MODULES = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    description: 'Overview and analytics',
    permissions: [
      { key: 'dashboard.view', label: 'View Dashboard', description: 'View dashboard and basic analytics', defaults: { MANAGER: true, MEMBER: true, CLIENT: true } },
      { key: 'dashboard.viewTeamStats', label: 'View Team Stats', description: 'View team-wide stats and charts', defaults: { MANAGER: true, MEMBER: false, CLIENT: false } }
    ]
  },
  {
    key: 'projects',
    label: 'Projects',
    icon: 'FolderKanban',
    description: 'Project management and collaboration',
    permissions: [
      { key: 'projects.view', label: 'View Projects', description: 'View project list & details', defaults: { MANAGER: true, MEMBER: true, CLIENT: true } },
      { key: 'projects.create', label: 'Create Projects', description: 'Create new projects', defaults: { MANAGER: true, MEMBER: false, CLIENT: false } },
      { key: 'projects.edit', label: 'Edit Projects', description: 'Edit project details', defaults: { MANAGER: true, MEMBER: false, CLIENT: false } },
      { key: 'projects.delete', label: 'Delete Projects', description: 'Delete projects', defaults: { MANAGER: false, MEMBER: false, CLIENT: false } },
      { key: 'projects.manageMembers', label: 'Manage Members', description: 'Add/remove project members', defaults: { MANAGER: true, MEMBER: false, CLIENT: false } }
    ]
  },
  {
    key: 'tasks',
    label: 'Tasks',
    icon: 'CheckSquare',
    description: 'Task assignment and tracking',
    permissions: [
      { key: 'tasks.view', label: 'View Tasks', description: 'View task list & details', defaults: { MANAGER: true, MEMBER: true, CLIENT: true } },
      { key: 'tasks.create', label: 'Create Tasks', description: 'Create new tasks', defaults: { MANAGER: true, MEMBER: true, CLIENT: false } },
      { key: 'tasks.edit', label: 'Edit Any Task', description: 'Edit any task (not just own)', defaults: { MANAGER: true, MEMBER: false, CLIENT: false } },
      { key: 'tasks.delete', label: 'Delete Tasks', description: 'Delete tasks', defaults: { MANAGER: true, MEMBER: false, CLIENT: false } },
      { key: 'tasks.assign', label: 'Assign Tasks', description: 'Assign tasks to others', defaults: { MANAGER: true, MEMBER: false, CLIENT: false } },
      { key: 'tasks.changeStatus', label: 'Change Status', description: 'Change task status', defaults: { MANAGER: true, MEMBER: true, CLIENT: false } },
      { key: 'tasks.comment', label: 'Comment on Tasks', description: 'Add comments on tasks', defaults: { MANAGER: true, MEMBER: true, CLIENT: true } }
    ]
  },
  {
    key: 'kanban',
    label: 'Kanban',
    icon: 'Kanban',
    description: 'Visual board for tasks',
    permissions: [
      { key: 'kanban.view', label: 'View Kanban', description: 'View Kanban board', defaults: { MANAGER: true, MEMBER: true, CLIENT: false } },
      { key: 'kanban.moveCards', label: 'Move Cards', description: 'Drag/move cards between columns', defaults: { MANAGER: true, MEMBER: true, CLIENT: false } }
    ]
  },
  {
    key: 'team',
    label: 'Team',
    icon: 'Users',
    description: 'Team directory and roles',
    permissions: [
      { key: 'team.view', label: 'View Team', description: 'View team member list', defaults: { MANAGER: true, MEMBER: true, CLIENT: false } },
      { key: 'team.invite', label: 'Add Member', description: 'Add new members', defaults: { MANAGER: true, MEMBER: false, CLIENT: false } },
      { key: 'team.remove', label: 'Remove Members', description: 'Remove team members', defaults: { MANAGER: false, MEMBER: false, CLIENT: false } },
      { key: 'team.viewProgress', label: 'View Progress', description: 'View member progress stats', defaults: { MANAGER: true, MEMBER: false, CLIENT: false } }
    ]
  },
  {
    key: 'timesheets',
    label: 'Timesheets',
    icon: 'Clock',
    description: 'Time logging and approval',
    permissions: [
      { key: 'timesheets.view', label: 'View Own', description: 'View own timesheets', defaults: { MANAGER: true, MEMBER: true, CLIENT: false } },
      { key: 'timesheets.viewAll', label: 'View All', description: 'View all team timesheets', defaults: { MANAGER: true, MEMBER: false, CLIENT: false } },
      { key: 'timesheets.create', label: 'Log Time', description: 'Log time entries', defaults: { MANAGER: true, MEMBER: true, CLIENT: false } },
      { key: 'timesheets.approve', label: 'Approve Time', description: 'Approve/reject time entries', defaults: { MANAGER: true, MEMBER: false, CLIENT: false } }
    ]
  },
  {
    key: 'chat',
    label: 'Chat',
    icon: 'MessageSquare',
    description: 'Real-time team communication',
    permissions: [
      { key: 'chat.view', label: 'Access Chat', description: 'Access chat feature', defaults: { MANAGER: true, MEMBER: true, CLIENT: false } },
      { key: 'chat.createRooms', label: 'Create Rooms', description: 'Create new chat rooms', defaults: { MANAGER: true, MEMBER: false, CLIENT: false } },
      { key: 'chat.deleteMessages', label: 'Delete Messages', description: 'Delete any message', defaults: { MANAGER: true, MEMBER: false, CLIENT: false } }
    ]
  },
  {
    key: 'performance',
    label: 'Performance',
    icon: 'BarChart2',
    description: 'KPIs and performance stats',
    permissions: [
      { key: 'performance.viewOwn', label: 'View Own', description: 'View own performance data', defaults: { MANAGER: true, MEMBER: true, CLIENT: false } },
      { key: 'performance.viewAll', label: 'View All', description: 'View all team performance', defaults: { MANAGER: true, MEMBER: false, CLIENT: false } }
    ]
  },
  {
    key: 'tickets',
    label: 'Tickets',
    icon: 'LifeBuoy',
    description: 'Support and issue tracking',
    permissions: [
      { key: 'tickets.view', label: 'View Tickets', description: 'View support tickets', defaults: { MANAGER: false, MEMBER: false, CLIENT: true } },
      { key: 'tickets.create', label: 'Create Tickets', description: 'Create support tickets', defaults: { MANAGER: false, MEMBER: false, CLIENT: true } },
      { key: 'tickets.manage', label: 'Manage Tickets', description: 'Assign/close/resolve tickets', defaults: { MANAGER: false, MEMBER: false, CLIENT: false } }
    ]
  },
  {
    key: 'integrations',
    label: 'Integrations',
    icon: 'Zap',
    description: 'Third-party app connections',
    permissions: [
      { key: 'integrations.view', label: 'View Integrations', description: 'View integrations', defaults: { MANAGER: true, MEMBER: true, CLIENT: false } },
      { key: 'integrations.manage', label: 'Manage', description: 'Connect/disconnect integrations', defaults: { MANAGER: true, MEMBER: false, CLIENT: false } }
    ]
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: 'BarChart3',
    description: 'Custom reports and exports',
    permissions: [
      { key: 'reports.view', label: 'View Reports', description: 'View reports', defaults: { MANAGER: true, MEMBER: false, CLIENT: true } },
      { key: 'reports.export', label: 'Export Reports', description: 'Export/download reports', defaults: { MANAGER: true, MEMBER: false, CLIENT: false } },
      { key: 'reports.import', label: 'Import Excel Data', description: 'Import data from Excel sheets', defaults: { MANAGER: false, MEMBER: false, CLIENT: false } }
    ]
  }
];

export const getDefaultPermissions = () => {
  const defaults = { MANAGER: {}, MEMBER: {}, CLIENT: {} };
  PERMISSION_MODULES.forEach(mod => {
    mod.permissions.forEach(p => {
      defaults.MANAGER[p.key] = p.defaults.MANAGER;
      defaults.MEMBER[p.key] = p.defaults.MEMBER;
      defaults.CLIENT[p.key] = p.defaults.CLIENT;
    });
  });
  return defaults;
};
