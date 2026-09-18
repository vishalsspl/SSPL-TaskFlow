import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * UniverSpreadsheetEditor - Excel-like spreadsheet using Univer
 * 
 * This is a lightweight wrapper that loads Univer dynamically. 
 * Since Univer packages are heavy, we use a simpler approach:
 * a full-featured HTML table-based spreadsheet with formulas,
 * multi-sheet support, and cell formatting.
 * 
 * The component stores data in a JSON structure compatible with
 * the backend's spreadsheet format.
 */

const DEFAULT_ROWS = 50;
const DEFAULT_COLS = 26;

function getColLabel(index) {
  let label = '';
  let i = index;
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
}

function parseCellRef(ref) {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  let col = 0;
  for (let i = 0; i < match[1].length; i++) {
    col = col * 26 + (match[1].charCodeAt(i) - 64);
  }
  return { row: parseInt(match[2], 10) - 1, col: col - 1 };
}

function evaluateFormula(formula, getCellValue) {
  try {
    const expr = formula.substring(1).toUpperCase();
    
    // Handle SUM, AVERAGE, MIN, MAX, COUNT
    const fnMatch = expr.match(/^(SUM|AVERAGE|AVG|MIN|MAX|COUNT|IF)\((.+)\)$/);
    if (fnMatch) {
      const fn = fnMatch[1];
      const args = fnMatch[2];
      
      // Handle range like A1:B5
      const rangeMatch = args.match(/^([A-Z]+\d+):([A-Z]+\d+)$/);
      if (rangeMatch) {
        const start = parseCellRef(rangeMatch[1]);
        const end = parseCellRef(rangeMatch[2]);
        if (!start || !end) return '#REF!';
        
        const values = [];
        for (let r = start.row; r <= end.row; r++) {
          for (let c = start.col; c <= end.col; c++) {
            const val = getCellValue(r, c);
            if (val !== '' && !isNaN(Number(val))) values.push(Number(val));
          }
        }
        
        if (fn === 'SUM') return values.reduce((a, b) => a + b, 0);
        if (fn === 'AVERAGE' || fn === 'AVG') return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        if (fn === 'MIN') return values.length ? Math.min(...values) : 0;
        if (fn === 'MAX') return values.length ? Math.max(...values) : 0;
        if (fn === 'COUNT') return values.length;
      }
    }

    // Handle simple cell references and math
    let evalExpr = expr.replace(/([A-Z]+\d+)/g, (match) => {
      const ref = parseCellRef(match);
      if (!ref) return '0';
      const val = getCellValue(ref.row, ref.col);
      return isNaN(Number(val)) ? '0' : Number(val);
    });
    
    // Safe eval for basic math
    const result = Function('"use strict"; return (' + evalExpr + ')')();
    return isNaN(result) ? '#ERROR!' : result;
  } catch (e) {
    return '#ERROR!';
  }
}

function createEmptySheet(name, id) {
  return {
    id,
    name,
    cellData: {},
    rowCount: DEFAULT_ROWS,
    columnCount: DEFAULT_COLS,
    colWidths: {},
    rowHeights: {},
    frozenRows: 0,
    frozenCols: 0,
    selection: null,
  };
}

export default function UniverSpreadsheetEditor({ content, onUpdate }) {
  const [sheets, setSheets] = useState({});
  const [activeSheetId, setActiveSheetId] = useState('');
  const [selection, setSelection] = useState({ row: 0, col: 0 });
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [selectionRange, setSelectionRange] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingSheetName, setEditingSheetName] = useState(null);
  const [sheetNameValue, setSheetNameValue] = useState('');
  const tableRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize from content
  useEffect(() => {
    try {
      const data = typeof content === 'string' ? JSON.parse(content || '{}') : (content || {});
      if (data.sheets && Object.keys(data.sheets).length > 0) {
        setSheets(data.sheets);
        setActiveSheetId(Object.keys(data.sheets)[0]);
      } else {
        const id = 'sheet1';
        const newSheets = { [id]: createEmptySheet('Sheet 1', id) };
        setSheets(newSheets);
        setActiveSheetId(id);
      }
    } catch {
      const id = 'sheet1';
      const newSheets = { [id]: createEmptySheet('Sheet 1', id) };
      setSheets(newSheets);
      setActiveSheetId(id);
    }
  }, []);

  const activeSheet = sheets[activeSheetId];

  const notifyUpdate = useCallback((newSheets) => {
    if (onUpdate) {
      onUpdate(JSON.stringify({ sheets: newSheets }));
    }
  }, [onUpdate]);

  const getCellValue = useCallback((row, col) => {
    if (!activeSheet) return '';
    const cell = activeSheet.cellData?.[row]?.[col];
    if (!cell) return '';
    return cell.v !== undefined ? cell.v : '';
  }, [activeSheet]);

  const getCellDisplay = useCallback((row, col) => {
    const val = getCellValue(row, col);
    if (typeof val === 'string' && val.startsWith('=')) {
      return evaluateFormula(val, getCellValue);
    }
    return val;
  }, [getCellValue]);

  const getCellStyle = useCallback((row, col) => {
    if (!activeSheet) return {};
    const cell = activeSheet.cellData?.[row]?.[col];
    if (!cell?.s) return {};
    const s = cell.s;
    const style = {};
    if (s.bold) style.fontWeight = 'bold';
    if (s.italic) style.fontStyle = 'italic';
    if (s.underline) style.textDecoration = 'underline';
    if (s.fontSize) style.fontSize = `${s.fontSize}px`;
    if (s.color) style.color = s.color;
    if (s.bg) style.backgroundColor = s.bg;
    if (s.align) style.textAlign = s.align;
    return style;
  }, [activeSheet]);

  const updateCell = useCallback((row, col, value, style) => {
    setSheets(prev => {
      const newSheets = { ...prev };
      const sheet = { ...newSheets[activeSheetId] };
      const cellData = { ...sheet.cellData };
      if (!cellData[row]) cellData[row] = {};
      cellData[row] = { ...cellData[row] };
      const existingCell = cellData[row][col] || {};
      cellData[row][col] = {
        ...existingCell,
        v: value !== undefined ? value : existingCell.v,
        s: style !== undefined ? { ...(existingCell.s || {}), ...style } : existingCell.s,
      };
      sheet.cellData = cellData;
      newSheets[activeSheetId] = sheet;
      notifyUpdate(newSheets);
      return newSheets;
    });
  }, [activeSheetId, notifyUpdate]);

  const handleCellClick = (row, col) => {
    setSelection({ row, col });
    setSelectionRange(null);
    setContextMenu(null);
  };

  const handleCellDoubleClick = (row, col) => {
    setEditingCell({ row, col });
    setEditValue(String(getCellValue(row, col)));
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const scrollToCell = (row, col) => {
    if (tableRef.current) {
      const cell = tableRef.current.querySelector(`td[data-row="${row}"][data-col="${col}"]`);
      if (cell) {
        cell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  };

  const handleCellKeyDown = (e) => {
    if (editingCell) return;
    
    const { row, col } = selection;
    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      handleCellDoubleClick(row, col);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      updateCell(row, col, '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newRow = Math.min(row + 1, (activeSheet?.rowCount || DEFAULT_ROWS) - 1);
      setSelection({ row: newRow, col });
      scrollToCell(newRow, col);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newRow = Math.max(row - 1, 0);
      setSelection({ row: newRow, col });
      scrollToCell(newRow, col);
    } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
      e.preventDefault();
      const newCol = Math.min(col + 1, (activeSheet?.columnCount || DEFAULT_COLS) - 1);
      setSelection({ row, col: newCol });
      scrollToCell(row, newCol);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const newCol = Math.max(col - 1, 0);
      setSelection({ row, col: newCol });
      scrollToCell(row, newCol);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      handleCellDoubleClick(row, col);
      setEditValue(e.key);
    }
  };

  const commitEdit = () => {
    if (editingCell) {
      let value = editValue;
      if (!isNaN(Number(value)) && value.trim() !== '') {
        value = Number(value);
      }
      updateCell(editingCell.row, editingCell.col, value);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      commitEdit();
      const newRow = prev => prev.row + 1; // Needs fix
      setSelection(prev => {
         const r = prev.row + 1;
         scrollToCell(r, prev.col);
         return { ...prev, row: r };
      });
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
      setSelection(prev => ({ ...prev, col: prev.col + 1 }));
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const applyStyle = (styleKey, styleValue) => {
    const { row, col } = selection;
    const cell = activeSheet?.cellData?.[row]?.[col] || {};
    const currentStyle = cell.s || {};
    const newValue = currentStyle[styleKey] === styleValue ? undefined : styleValue;
    updateCell(row, col, undefined, { [styleKey]: newValue });
  };

  const addSheet = () => {
    const id = `sheet${Date.now()}`;
    const num = Object.keys(sheets).length + 1;
    const newSheets = { ...sheets, [id]: createEmptySheet(`Sheet ${num}`, id) };
    setSheets(newSheets);
    setActiveSheetId(id);
    notifyUpdate(newSheets);
  };

  const deleteSheet = (id) => {
    if (Object.keys(sheets).length <= 1) return;
    const newSheets = { ...sheets };
    delete newSheets[id];
    setSheets(newSheets);
    if (activeSheetId === id) {
      setActiveSheetId(Object.keys(newSheets)[0]);
    }
    notifyUpdate(newSheets);
  };

  const renameSheet = (id, newName) => {
    const newSheets = { ...sheets };
    newSheets[id] = { ...newSheets[id], name: newName };
    setSheets(newSheets);
    setEditingSheetName(null);
    notifyUpdate(newSheets);
  };

  const addRow = () => {
    setSheets(prev => {
      const newSheets = { ...prev };
      const sheet = { ...newSheets[activeSheetId] };
      sheet.rowCount = (sheet.rowCount || DEFAULT_ROWS) + 1;
      newSheets[activeSheetId] = sheet;
      notifyUpdate(newSheets);
      return newSheets;
    });
  };

  const addColumn = () => {
    setSheets(prev => {
      const newSheets = { ...prev };
      const sheet = { ...newSheets[activeSheetId] };
      sheet.columnCount = (sheet.columnCount || DEFAULT_COLS) + 1;
      newSheets[activeSheetId] = sheet;
      notifyUpdate(newSheets);
      return newSheets;
    });
  };

  const handleContextMenu = (e, row, col) => {
    e.preventDefault();
    setSelection({ row, col });
    setContextMenu({ x: e.clientX, y: e.clientY, row, col });
  };

  if (!activeSheet) return null;

  const rowCount = activeSheet.rowCount || DEFAULT_ROWS;
  const colCount = activeSheet.columnCount || DEFAULT_COLS;
  const currentCellRef = `${getColLabel(selection.col)}${selection.row + 1}`;
  const currentCellValue = getCellValue(selection.row, selection.col);
  const currentCellStyle = activeSheet?.cellData?.[selection.row]?.[selection.col]?.s || {};

  return (
    <div className="flex flex-col h-full border border-border rounded-xl overflow-hidden bg-background" onClick={() => setContextMenu(null)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-border bg-secondary/30">
        <button
          onClick={() => applyStyle('bold', true)}
          className={`h-7 w-7 flex items-center justify-center rounded text-xs font-bold ${currentCellStyle.bold ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
          title="Bold"
        >B</button>
        <button
          onClick={() => applyStyle('italic', true)}
          className={`h-7 w-7 flex items-center justify-center rounded text-xs italic ${currentCellStyle.italic ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
          title="Italic"
        >I</button>
        <button
          onClick={() => applyStyle('underline', true)}
          className={`h-7 w-7 flex items-center justify-center rounded text-xs underline ${currentCellStyle.underline ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
          title="Underline"
        >U</button>
        <div className="w-px h-5 bg-border mx-1" />
        <select
          value={currentCellStyle.fontSize || '13'}
          onChange={(e) => applyStyle('fontSize', e.target.value)}
          className="h-7 px-1 text-xs border border-border rounded bg-background"
        >
          {['10', '11', '12', '13', '14', '16', '18', '20', '24', '28', '32'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="w-px h-5 bg-border mx-1" />
        <label className="flex items-center gap-1 text-xs text-muted-foreground" title="Text Color">
          A
          <input
            type="color"
            value={currentCellStyle.color || '#000000'}
            onChange={(e) => applyStyle('color', e.target.value)}
            className="w-5 h-5 border-0 p-0 cursor-pointer"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground" title="Background Color">
          <span className="w-4 h-4 rounded border border-border" style={{ backgroundColor: currentCellStyle.bg || '#ffffff' }} />
          <input
            type="color"
            value={currentCellStyle.bg || '#ffffff'}
            onChange={(e) => applyStyle('bg', e.target.value)}
            className="w-0 h-0 opacity-0 absolute"
          />
        </label>
        <div className="w-px h-5 bg-border mx-1" />
        {['left', 'center', 'right'].map(align => (
          <button
            key={align}
            onClick={() => applyStyle('align', align)}
            className={`h-7 w-7 flex items-center justify-center rounded text-[10px] ${currentCellStyle.align === align ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
            title={`Align ${align}`}
          >
            {align === 'left' ? '⫷' : align === 'center' ? '⫸' : '⫹'}
          </button>
        ))}
      </div>

      {/* Formula Bar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-border bg-card">
        <span className="text-xs font-mono font-medium text-muted-foreground w-12 text-center border-r border-border pr-2">{currentCellRef}</span>
        <span className="text-xs text-muted-foreground">fx</span>
        <input
          className="flex-1 h-6 text-xs bg-transparent border-none outline-none font-mono"
          value={editingCell ? editValue : String(currentCellValue)}
          onChange={(e) => {
            if (editingCell) setEditValue(e.target.value);
          }}
          onFocus={() => {
            if (!editingCell) handleCellDoubleClick(selection.row, selection.col);
          }}
        />
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto relative w-full pb-4" tabIndex={0} onKeyDown={handleCellKeyDown}>
        <table ref={tableRef} className="border-collapse text-xs table-fixed" style={{ width: 'max-content', minWidth: '100%' }}>
          <thead className="sticky top-0 z-10">
            <tr>
              <th 
                className="bg-secondary border border-border h-7 text-[10px] text-muted-foreground font-medium sticky left-0 z-20"
                style={{ width: 40, minWidth: 40 }}
              />
              {Array.from({ length: colCount }, (_, c) => (
                <th
                  key={c}
                  className="bg-secondary border border-border h-7 text-[10px] text-muted-foreground font-medium px-1"
                  style={{ width: activeSheet.colWidths?.[c] || 80, minWidth: activeSheet.colWidths?.[c] || 80 }}
                >
                  {getColLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.min(rowCount, 200) }, (_, r) => (
              <tr key={r}>
                <td 
                  className="bg-secondary border border-border text-center text-[10px] text-muted-foreground font-medium sticky left-0 z-10"
                  style={{ width: 40, minWidth: 40 }}
                >
                  {r + 1}
                </td>
                {Array.from({ length: colCount }, (_, c) => {
                  const isSelected = selection.row === r && selection.col === c;
                  const isEditing = editingCell?.row === r && editingCell?.col === c;
                  const cellStyle = getCellStyle(r, c);
                  
                  return (
                    <td
                      key={c}
                      data-row={r}
                      data-col={c}
                      className={`border border-border px-1 h-7 relative cursor-cell overflow-hidden whitespace-nowrap text-ellipsis ${isSelected ? 'outline outline-2 outline-primary outline-offset-[-1px]' : ''}`}
                      style={{
                        ...cellStyle,
                        minWidth: activeSheet.colWidths?.[c] || 80,
                        height: activeSheet.rowHeights?.[r] || 28,
                      }}
                      onClick={() => handleCellClick(r, c)}
                      onDoubleClick={() => handleCellDoubleClick(r, c)}
                      onContextMenu={(e) => handleContextMenu(e, r, c)}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          className="w-full h-full border-none outline-none bg-white dark:bg-zinc-900 text-xs absolute inset-0 px-1"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={handleEditKeyDown}
                          autoFocus
                        />
                      ) : (
                        <span className="block truncate">
                          {getCellDisplay(r, c)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button className="w-full px-3 py-1.5 text-xs text-left hover:bg-secondary" onClick={() => { addRow(); setContextMenu(null); }}>Insert Row</button>
          <button className="w-full px-3 py-1.5 text-xs text-left hover:bg-secondary" onClick={() => { addColumn(); setContextMenu(null); }}>Insert Column</button>
          <div className="border-t border-border my-1" />
          <button className="w-full px-3 py-1.5 text-xs text-left hover:bg-secondary" onClick={() => { updateCell(contextMenu.row, contextMenu.col, ''); setContextMenu(null); }}>Clear Cell</button>
        </div>
      )}

      {/* Sheet Tabs */}
      <div className="flex items-center gap-1 px-2 py-1 border-t border-border bg-secondary/30 overflow-x-auto">
        {Object.entries(sheets).map(([id, sheet]) => (
          <div
            key={id}
            className={`flex items-center gap-1 px-3 py-1 rounded-t text-xs cursor-pointer border border-b-0 ${
              activeSheetId === id ? 'bg-card border-border font-medium' : 'bg-secondary/50 border-transparent text-muted-foreground hover:bg-secondary'
            }`}
            onClick={() => setActiveSheetId(id)}
            onDoubleClick={() => {
              setEditingSheetName(id);
              setSheetNameValue(sheet.name);
            }}
          >
            {editingSheetName === id ? (
              <input
                className="w-20 text-xs border-none outline-none bg-transparent"
                value={sheetNameValue}
                onChange={(e) => setSheetNameValue(e.target.value)}
                onBlur={() => renameSheet(id, sheetNameValue)}
                onKeyDown={(e) => e.key === 'Enter' && renameSheet(id, sheetNameValue)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span>{sheet.name}</span>
            )}
            {Object.keys(sheets).length > 1 && (
              <button
                className="ml-1 text-muted-foreground hover:text-destructive text-[10px]"
                onClick={(e) => { e.stopPropagation(); deleteSheet(id); }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:bg-secondary text-sm"
          onClick={addSheet}
          title="Add Sheet"
        >
          +
        </button>
      </div>
    </div>
  );
}
