const KEY='dabt.pro.v3.sessions';
export function readSessions(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
export function saveSession(session){const rows=readSessions();if(rows.some(x=>x.id===session.id))return false;rows.unshift(session);localStorage.setItem(KEY,JSON.stringify(rows.slice(0,250)));return true}
export function exportSessions(){return JSON.stringify({schema:'dabt-session-log',version:1,exportedAt:new Date().toISOString(),sessions:readSessions()},null,2)}
