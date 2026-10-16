import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';

/**
 * Extracts non-productive / break hours from the description bracket metadata.
 * 
 * Examples handled:
 * - Sick/Casual/Paid/Unpaid Leave: 0 break hours
 * - Custom Shift: '... - [Custom Shift: 10:00 AM–07:30 PM (Break 1.5 h)]' => 1.5
 * - Day portions: '... - [1/4 Day]' => 0.375, '[1/2 Day]' => 0.75, '[3/4 Day]' => 1.125, '[Full Day]' => 1.5
 * - Quarters: 1st/2nd/3rd/4th Quarter => 0.75 per quarter
 *
 * @param {string|object} description - Entry description string or entry object
 * @returns {number} Non-productive break hours
 */
export function getNonProductiveHours(description) {
  const desc = typeof description === 'string' ? description : (description?.description || '');
  if (!desc || typeof desc !== 'string') return 0;

  if (desc.includes('[') && desc.includes(']')) {
    // Leave entries have no break deduction
    if (/\[(Sick Leave|Casual Leave|Paid Leave|Unpaid Leave)\]/i.test(desc)) {
      return 0;
    }

    // Custom Shift with explicit break: e.g. (Break 1.5 h) or (Break 0.5h)
    const breakMatch = desc.match(/Break\s*([\d.]+)\s*h/i);
    if (breakMatch) {
      return parseFloat(breakMatch[1]) || 0;
    }

    // Day portions for shifts
    const portionMap = {
      '1/4 Day': 0.375,
      '1/2 Day': 0.75,
      '3/4 Day': 1.125,
      'Full Day': 1.5
    };
    for (const [key, val] of Object.entries(portionMap)) {
      if (desc.includes(key)) {
        return val;
      }
    }

    // Quarter shifts
    let qCount = 0;
    if (desc.includes('1st Quarter')) qCount++;
    if (desc.includes('2nd Quarter')) qCount++;
    if (desc.includes('3rd Quarter')) qCount++;
    if (desc.includes('4th Quarter')) qCount++;
    if (qCount > 0) return qCount * 0.75;

    // Fallback search within brackets
    const bracketMatch = desc.match(/\[(.*?)\]/);
    if (bracketMatch) {
      const text = bracketMatch[1];
      if (text.includes('Custom Shift:')) {
        const customBreak = text.match(/Break\s*([\d.]+)\s*h/i);
        if (customBreak) {
          return parseFloat(customBreak[1]) || 0;
        }
      }
    }
  }

  return 0;
}

/**
 * Returns leave type ('Sick Leave', 'Casual Leave', etc.) or 'Project Work'.
 *
 * @param {string|object} description - Entry description string or entry object
 * @returns {string} Category name
 */
export function getEntryCategory(description) {
  const desc = typeof description === 'string' ? description : (description?.description || '');
  if (!desc || typeof desc !== 'string') return 'Project Work';

  if (/\[Sick Leave\]/i.test(desc) || /\bSick Leave\b/i.test(desc)) return 'Sick Leave';
  if (/\[Casual Leave\]/i.test(desc) || /\bCasual Leave\b/i.test(desc)) return 'Casual Leave';
  if (/\[Paid Leave\]/i.test(desc) || /\bPaid Leave\b/i.test(desc)) return 'Paid Leave';
  if (/\[Unpaid Leave\]/i.test(desc) || /\bUnpaid Leave\b/i.test(desc)) return 'Unpaid Leave';
  if (/\[Leave\]/i.test(desc)) return 'Leave';

  return 'Project Work';
}

/**
 * Removes bracket metadata from entry description to produce clean user notes.
 *
 * Examples:
 * - '[Sick Leave] - [Full Day] - some notes' => 'some notes'
 * - '[Casual Leave] - [1/2 Day]' => ''
 * - 'Some description - [Custom Shift: 10:00 AM–07:30 PM (Break 1.5 h)]' => 'Some description'
 * - 'Some description - [Direct Hours: 4h]' => 'Some description'
 * - 'Logged for [Direct Hours: 4h]' => ''
 *
 * @param {string} description - Raw description string
 * @returns {string} Cleaned description
 */
export function cleanDescription(description) {
  if (!description || typeof description !== 'string') return '';
  let cleaned = description;

  // Remove "Logged for [metadata]"
  cleaned = cleaned.replace(/Logged for\s*\[[^\]]*\]/gi, '');

  // Remove leave prefixes like [Sick Leave] - [Full Day] - or [Casual Leave] - [1/2 Day]
  cleaned = cleaned.replace(/\[(Sick Leave|Casual Leave|Paid Leave|Unpaid Leave)\]\s*-\s*\[(1\/4 Day|1\/2 Day|3\/4 Day|Full Day)\]\s*-?\s*/gi, '');

  // Remove trailing shift or direct hours metadata like " - [Custom Shift: ...]" or " - [Direct Hours: ...]"
  cleaned = cleaned.replace(/\s*-\s*\[(Custom Shift|Direct Hours)[^\]]*\]/gi, '');

  // Remove any remaining bracketed tokens
  cleaned = cleaned.replace(/\[[^\]]*\]/g, '');

  // Clean up any remaining leading/trailing dashes and whitespace
  cleaned = cleaned.replace(/^\s*-\s*|\s*-\s*$/g, '').trim();

  return cleaned;
}

/**
 * Formats an ISO date string or Date object to YYYY-MM-DD.
 *
 * @param {string|Date} dateStr - Input date
 * @returns {string} Formatted date (YYYY-MM-DD)
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return format(d, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

/**
 * Returns full day name (e.g. 'Monday', 'Tuesday') for a given date.
 *
 * @param {string|Date} dateStr - Input date
 * @returns {string} Full day name
 */
export function getDayName(dateStr) {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return format(d, 'EEEE');
  } catch {
    return '';
  }
}

/**
 * Generates and downloads a multi-sheet Excel (.xlsx) workbook from timesheet data.
 *
 * Contains 5 sheets:
 * 1. Overview (Executive summary, KPI cards, approval counters)
 * 2. Detailed Logs (Chronological itemized list of all time entries)
 * 3. Member Summary (Team member hours, attendance, approval rates)
 * 4. Project Summary (Project breakdown, hours, contributors, task counts)
 * 5. Daily Matrix (Pivot table of member hours by date with daily and grand totals)
 *
 * @param {object} options
 * @param {Array} options.entries - Array of TimeEntry objects
 * @param {object} options.dateRange - { from: Date|string, to: Date|string }
 * @param {string} options.orgName - Organization name
 * @param {Array} options.users - Team member objects [{ id, name, email, role }]
 * @param {Array} options.projects - Project objects [{ id, name }]
 * @param {string} options.generatedBy - Name of user generating the report
 * @returns {object} Object containing { workbook, filename }
 */
export function generateTimesheetExcelReport({
  entries = [],
  dateRange,
  orgName = 'TaskFlow Organization',
  users = [],
  projects = [],
  generatedBy = 'System User'
}) {
  // ── Normalize Date Range ──────────────────────────────────────────────────
  let fromDate = dateRange?.from
    ? (typeof dateRange.from === 'string' ? parseISO(dateRange.from) : new Date(dateRange.from))
    : null;
  let toDate = dateRange?.to
    ? (typeof dateRange.to === 'string' ? parseISO(dateRange.to) : new Date(dateRange.to))
    : null;

  if (!fromDate || isNaN(fromDate.getTime())) {
    if (entries.length > 0) {
      const timestamps = entries
        .map(e => new Date(e.date).getTime())
        .filter(t => !isNaN(t));
      fromDate = timestamps.length ? new Date(Math.min(...timestamps)) : new Date();
    } else {
      fromDate = new Date();
    }
  }

  if (!toDate || isNaN(toDate.getTime())) {
    if (entries.length > 0) {
      const timestamps = entries
        .map(e => new Date(e.date).getTime())
        .filter(t => !isNaN(t));
      toDate = timestamps.length ? new Date(Math.max(...timestamps)) : fromDate;
    } else {
      toDate = fromDate;
    }
  }

  if (fromDate > toDate) {
    const temp = fromDate;
    fromDate = toDate;
    toDate = temp;
  }

  // ── 1. SHEET: Overview ───────────────────────────────────────────────────
  const totalHours = Math.round(
    entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0) * 100
  ) / 100;

  const breakHours = Math.round(
    entries.reduce((sum, e) => sum + getNonProductiveHours(e.description), 0) * 100
  ) / 100;

  const productiveHours = Math.round(
    entries.reduce((sum, e) => {
      const b = getNonProductiveHours(e.description);
      return sum + Math.max(0, (Number(e.hours) || 0) - b);
    }, 0) * 100
  ) / 100;

  const billableHours = Math.round(
    entries
      .filter(e => Boolean(e.billable))
      .reduce((sum, e) => sum + (Number(e.hours) || 0), 0) * 100
  ) / 100;

  const nonBillableHours = Math.round((totalHours - billableHours) * 100) / 100;
  const billablePercent = totalHours > 0
    ? ((billableHours / totalHours) * 100).toFixed(1)
    : '0.0';

  const sickLeaveHours = Math.round(
    entries
      .filter(e => getEntryCategory(e.description) === 'Sick Leave')
      .reduce((sum, e) => sum + (Number(e.hours) || 0), 0) * 100
  ) / 100;

  const casualLeaveHours = Math.round(
    entries
      .filter(e => getEntryCategory(e.description) === 'Casual Leave')
      .reduce((sum, e) => sum + (Number(e.hours) || 0), 0) * 100
  ) / 100;

  const paidLeaveHours = Math.round(
    entries
      .filter(e => getEntryCategory(e.description) === 'Paid Leave')
      .reduce((sum, e) => sum + (Number(e.hours) || 0), 0) * 100
  ) / 100;

  const unpaidLeaveHours = Math.round(
    entries
      .filter(e => getEntryCategory(e.description) === 'Unpaid Leave')
      .reduce((sum, e) => sum + (Number(e.hours) || 0), 0) * 100
  ) / 100;

  const approvedCount = entries.filter(e => e.status === 'APPROVED').length;
  const pendingCount = entries.filter(e => e.status === 'PENDING' || e.status === 'SUBMITTED').length;
  const rejectedCount = entries.filter(e => e.status === 'REJECTED').length;
  const draftCount = entries.filter(e => e.status === 'DRAFT').length;

  const reportPeriodFormatted = `${format(fromDate, 'MMM dd, yyyy')} – ${format(toDate, 'MMM dd, yyyy')}`;
  const generatedOnFormatted = format(new Date(), 'MMM dd, yyyy, hh:mm a');

  const overviewAoa = [
    ['TaskFlow Timesheet Report'],
    [],
    ['Organization:', orgName],
    ['Report Period:', reportPeriodFormatted],
    ['Generated By:', generatedBy],
    ['Generated On:', generatedOnFormatted],
    [],
    ['HOURS SUMMARY'],
    ['Total Logged Hours', totalHours],
    ['Productive Hours', productiveHours],
    ['Non-Productive / Break Hours', breakHours],
    ['Billable Hours', billableHours],
    ['Non-Billable Hours', nonBillableHours],
    ['Billable %', `${billablePercent}%`],
    [],
    ['LEAVE SUMMARY'],
    ['Sick Leave Hours', sickLeaveHours],
    ['Casual Leave Hours', casualLeaveHours],
    ['Paid Leave Hours', paidLeaveHours],
    ['Unpaid Leave Hours', unpaidLeaveHours],
    [],
    ['APPROVAL STATUS'],
    ['Approved Entries', approvedCount],
    ['Submitted / Pending', pendingCount],
    ['Rejected Entries', rejectedCount],
    ['Draft Entries', draftCount]
  ];

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewAoa);
  overviewSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
  overviewSheet['!cols'] = [{ wch: 30 }, { wch: 25 }];

  // ── 2. SHEET: Detailed Logs ──────────────────────────────────────────────
  const sortedEntries = [...entries].sort((a, b) => {
    const timeA = new Date(a.date).getTime() || 0;
    const timeB = new Date(b.date).getTime() || 0;
    if (timeA !== timeB) return timeA - timeB;
    const nameA = (a.user?.name || '').toLowerCase();
    const nameB = (b.user?.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const detailedRows = sortedEntries.map(entry => {
    const breakHrs = getNonProductiveHours(entry.description);
    const rawHours = Number(entry.hours) || 0;
    const productiveHrs = Math.max(0, Math.round((rawHours - breakHrs) * 100) / 100);
    const memberName = entry.user?.name || users?.find(u => u.id === entry.userId)?.name || 'Unknown';
    const memberEmail = entry.user?.email || users?.find(u => u.id === entry.userId)?.email || 'N/A';
    const isLeave = getEntryCategory(entry.description) !== 'Project Work';
    const projectName = entry.project?.name || projects?.find(p => p.id === entry.projectId)?.name || (isLeave ? 'Leave' : 'N/A');
    const taskTitle = entry.task?.title || 'N/A';

    return {
      'Date': formatDate(entry.date),
      'Day': getDayName(entry.date),
      'Member Name': memberName,
      'Member Email': memberEmail,
      'Project': projectName,
      'Task': taskTitle,
      'Hours': Math.round(rawHours * 100) / 100,
      'Productive Hrs': productiveHrs,
      'Break Hrs': Math.round(breakHrs * 100) / 100,
      'Billable': entry.billable ? 'Yes' : 'No',
      'Status': entry.status || 'PENDING',
      'Category': getEntryCategory(entry.description),
      'Description': cleanDescription(entry.description),
      'Entry Mode': entry.isManual ? 'Manual' : 'Timer'
    };
  });

  const detailedSheet = XLSX.utils.json_to_sheet(detailedRows, {
    header: [
      'Date', 'Day', 'Member Name', 'Member Email', 'Project', 'Task',
      'Hours', 'Productive Hrs', 'Break Hrs', 'Billable', 'Status',
      'Category', 'Description', 'Entry Mode'
    ]
  });

  detailedSheet['!cols'] = [
    { wch: 12 }, // Date
    { wch: 12 }, // Day
    { wch: 20 }, // Member Name
    { wch: 25 }, // Member Email
    { wch: 20 }, // Project
    { wch: 25 }, // Task
    { wch: 10 }, // Hours
    { wch: 14 }, // Productive Hrs
    { wch: 12 }, // Break Hrs
    { wch: 10 }, // Billable
    { wch: 12 }, // Status
    { wch: 15 }, // Category
    { wch: 35 }, // Description
    { wch: 12 }  // Entry Mode
  ];

  // ── 3. SHEET: Member Summary ─────────────────────────────────────────────
  const userMap = new Map();

  for (const entry of entries) {
    const uid = entry.userId || entry.user?.id || 'unknown';
    if (!userMap.has(uid)) {
      const uInfo = entry.user || users?.find(u => u.id === uid) || {};
      userMap.set(uid, {
        id: uid,
        name: uInfo.name || 'Unknown',
        email: uInfo.email || 'N/A',
        entries: []
      });
    }
    userMap.get(uid).entries.push(entry);
  }

  const memberRows = Array.from(userMap.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(userGroup => {
      const uEntries = userGroup.entries;
      const uTotalHours = Math.round(
        uEntries.reduce((s, e) => s + (Number(e.hours) || 0), 0) * 100
      ) / 100;

      const uBreakHours = Math.round(
        uEntries.reduce((s, e) => s + getNonProductiveHours(e.description), 0) * 100
      ) / 100;

      const uProductiveHours = Math.round(
        uEntries.reduce((s, e) => {
          const b = getNonProductiveHours(e.description);
          return s + Math.max(0, (Number(e.hours) || 0) - b);
        }, 0) * 100
      ) / 100;

      const uBillableHours = Math.round(
        uEntries
          .filter(e => Boolean(e.billable))
          .reduce((s, e) => s + (Number(e.hours) || 0), 0) * 100
      ) / 100;

      const uBillablePercent = uTotalHours > 0
        ? `${((uBillableHours / uTotalHours) * 100).toFixed(1)}%`
        : '0.0%';

      const uLeaveHours = Math.round(
        uEntries
          .filter(e => getEntryCategory(e.description) !== 'Project Work')
          .reduce((s, e) => s + (Number(e.hours) || 0), 0) * 100
      ) / 100;

      const uApprovedHours = Math.round(
        uEntries
          .filter(e => e.status === 'APPROVED')
          .reduce((s, e) => s + (Number(e.hours) || 0), 0) * 100
      ) / 100;

      const uPendingHours = Math.round(
        uEntries
          .filter(e => e.status === 'PENDING' || e.status === 'SUBMITTED')
          .reduce((s, e) => s + (Number(e.hours) || 0), 0) * 100
      ) / 100;

      // Days worked: distinct dates where member logged Project Work
      const workEntries = uEntries.filter(e => getEntryCategory(e.description) === 'Project Work');
      const workDates = new Set(workEntries.map(e => formatDate(e.date)).filter(Boolean));
      const daysWorked = workDates.size;

      // Average hours per day: work hours divided by days worked
      const workHours = Math.round(
        workEntries.reduce((s, e) => s + (Number(e.hours) || 0), 0) * 100
      ) / 100;
      const avgHoursPerDay = daysWorked > 0
        ? Math.round((workHours / daysWorked) * 100) / 100
        : 0;

      return {
        'Member Name': userGroup.name,
        'Email': userGroup.email,
        'Days Worked': daysWorked,
        'Total Hours': uTotalHours,
        'Productive Hours': uProductiveHours,
        'Break Hours': uBreakHours,
        'Billable Hours': uBillableHours,
        'Billable %': uBillablePercent,
        'Leave Hours': uLeaveHours,
        'Approved Hours': uApprovedHours,
        'Pending Hours': uPendingHours,
        'Avg Hours/Day': avgHoursPerDay
      };
    });

  const memberSheet = XLSX.utils.json_to_sheet(memberRows, {
    header: [
      'Member Name', 'Email', 'Days Worked', 'Total Hours', 'Productive Hours',
      'Break Hours', 'Billable Hours', 'Billable %', 'Leave Hours',
      'Approved Hours', 'Pending Hours', 'Avg Hours/Day'
    ]
  });

  memberSheet['!cols'] = [
    { wch: 22 }, // Member Name
    { wch: 26 }, // Email
    { wch: 14 }, // Days Worked
    { wch: 14 }, // Total Hours
    { wch: 16 }, // Productive Hours
    { wch: 14 }, // Break Hours
    { wch: 14 }, // Billable Hours
    { wch: 12 }, // Billable %
    { wch: 14 }, // Leave Hours
    { wch: 15 }, // Approved Hours
    { wch: 15 }, // Pending Hours
    { wch: 15 }  // Avg Hours/Day
  ];

  // ── 4. SHEET: Project Summary ────────────────────────────────────────────
  const projectMap = new Map();

  for (const entry of entries) {
    const isLeave = getEntryCategory(entry.description) !== 'Project Work';
    let pKey;
    let pName;

    if (entry.projectId) {
      pKey = entry.projectId;
      pName = entry.project?.name || projects?.find(p => p.id === entry.projectId)?.name || `Project ${entry.projectId}`;
    } else if (isLeave) {
      pKey = '__LEAVE__';
      pName = 'Leave';
    } else {
      pKey = '__INTERNAL__';
      pName = entry.project?.name || 'General / Non-Project';
    }

    if (!projectMap.has(pKey)) {
      projectMap.set(pKey, {
        name: pName,
        entries: []
      });
    }
    projectMap.get(pKey).entries.push(entry);
  }

  const projectRows = Array.from(projectMap.values())
    .map(pGroup => {
      const pEntries = pGroup.entries;
      const pTotalHours = Math.round(
        pEntries.reduce((s, e) => s + (Number(e.hours) || 0), 0) * 100
      ) / 100;

      const pBillableHours = Math.round(
        pEntries
          .filter(e => Boolean(e.billable))
          .reduce((s, e) => s + (Number(e.hours) || 0), 0) * 100
      ) / 100;

      const pNonBillableHours = Math.round((pTotalHours - pBillableHours) * 100) / 100;

      const contributors = new Set(
        pEntries.map(e => e.userId || e.user?.id || e.user?.name).filter(Boolean)
      ).size;

      const tasksWorked = new Set(
        pEntries.map(e => e.taskId || e.task?.id || e.task?.title).filter(Boolean)
      ).size;

      const pctOfTotal = totalHours > 0
        ? `${((pTotalHours / totalHours) * 100).toFixed(1)}%`
        : '0.0%';

      return {
        'Project Name': pGroup.name,
        'Total Hours': pTotalHours,
        'Billable Hours': pBillableHours,
        'Non-Billable Hours': pNonBillableHours,
        'Contributors': contributors,
        'Tasks Worked': tasksWorked,
        '% of Total Time': pctOfTotal,
        _totalHoursRaw: pTotalHours
      };
    })
    .sort((a, b) => b._totalHoursRaw - a._totalHoursRaw)
    .map(({ _totalHoursRaw, ...rest }) => rest);

  const projectSheet = XLSX.utils.json_to_sheet(projectRows, {
    header: [
      'Project Name', 'Total Hours', 'Billable Hours', 'Non-Billable Hours',
      'Contributors', 'Tasks Worked', '% of Total Time'
    ]
  });

  projectSheet['!cols'] = [
    { wch: 25 }, // Project Name
    { wch: 14 }, // Total Hours
    { wch: 14 }, // Billable Hours
    { wch: 18 }, // Non-Billable Hours
    { wch: 14 }, // Contributors
    { wch: 14 }, // Tasks Worked
    { wch: 16 }  // % of Total Time
  ];

  // ── 5. SHEET: Daily Matrix ───────────────────────────────────────────────
  const matrixDays = [];
  const curDay = new Date(fromDate);
  curDay.setHours(0, 0, 0, 0);
  const endDay = new Date(toDate);
  endDay.setHours(0, 0, 0, 0);

  // Safeguard against unbounded date ranges
  let safetyCounter = 90;
  while (curDay <= endDay && safetyCounter > 0) {
    matrixDays.push(new Date(curDay));
    curDay.setDate(curDay.getDate() + 1);
    safetyCounter--;
  }

  const matrixHeaders = [
    'Member Name',
    ...matrixDays.map(d => format(d, 'MMM dd (EEE)')),
    'Total'
  ];

  const dailyColumnSums = new Array(matrixDays.length).fill(0);
  let matrixGrandTotal = 0;

  const matrixRows = Array.from(userMap.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(userGroup => {
      let memberTotal = 0;
      const row = [userGroup.name];

      matrixDays.forEach((day, colIdx) => {
        const dayDateStr = formatDate(day);
        const dayHours = userGroup.entries
          .filter(e => formatDate(e.date) === dayDateStr)
          .reduce((sum, e) => sum + (Number(e.hours) || 0), 0);

        const roundedDayHours = Math.round(dayHours * 100) / 100;
        row.push(roundedDayHours);
        memberTotal += roundedDayHours;
        dailyColumnSums[colIdx] += roundedDayHours;
      });

      const roundedMemberTotal = Math.round(memberTotal * 100) / 100;
      row.push(roundedMemberTotal);
      matrixGrandTotal += roundedMemberTotal;
      return row;
    });

  const totalRow = [
    'TOTAL',
    ...dailyColumnSums.map(sum => Math.round(sum * 100) / 100),
    Math.round(matrixGrandTotal * 100) / 100
  ];

  const dailyMatrixAoa = [matrixHeaders, ...matrixRows, totalRow];
  const dailyMatrixSheet = XLSX.utils.aoa_to_sheet(dailyMatrixAoa);

  dailyMatrixSheet['!cols'] = [
    { wch: 22 }, // Member Name
    ...matrixDays.map(() => ({ wch: 14 })), // Each day
    { wch: 14 } // Total
  ];

  // ── Build & Save Workbook ────────────────────────────────────────────────
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');
  XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed Logs');
  XLSX.utils.book_append_sheet(workbook, memberSheet, 'Member Summary');
  XLSX.utils.book_append_sheet(workbook, projectSheet, 'Project Summary');
  XLSX.utils.book_append_sheet(workbook, dailyMatrixSheet, 'Daily Matrix');

  const filename = `TaskFlow_Timesheet_${format(fromDate, 'yyyy-MM-dd')}_to_${format(toDate, 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, filename);

  return { workbook, filename };
}

export default generateTimesheetExcelReport;
