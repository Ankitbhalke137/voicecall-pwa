const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const API = 'https://api.telegram.org';

export function isConfigured() {
  return Boolean(BOT_TOKEN && ADMIN_CHAT_ID);
}

export function formatDuration(sec) {
  if (sec == null) return '-';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function formatCallMessage(call) {
  const statusIcon =
    call.status === 'answered' ? '✅' : call.status === 'declined' ? '❌' : '📵';
  return [
    `${statusIcon} ${call.caller_name || 'Unknown'} → ${call.callee_name || 'Unknown'}`,
    `Status: ${call.status}${call.status === 'answered' ? ` · Duration: ${formatDuration(call.duration_sec)}` : ''}`,
    `Time: ${call.started_at}`
  ].join('\n');
}

export async function sendMessage(text) {
  if (!isConfigured()) return false;
  try {
    const res = await fetch(`${API}/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text, parse_mode: 'HTML' })
    });
    if (!res.ok) {
      console.error('[telegram] sendMessage failed:', res.status, await res.text());
    }
    return res.ok;
  } catch (err) {
    console.error('[telegram] sendMessage error:', err.message);
    return false;
  }
}

export function notifyCallEnded(call) {
  return sendMessage(`📞 <b>Call finished</b>\n${formatCallMessage(call)}`);
}

async function buildStats(db) {
  const row = await db.all(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'answered' THEN 1 ELSE 0 END) AS answered,
            SUM(CASE WHEN status = 'answered' THEN duration_sec ELSE 0 END) AS minutes,
            SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) AS declined,
            SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) AS missed
     FROM call_logs`
  );
  return row[0];
}

async function buildTodayStats(db) {
  const row = await db.all(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'answered' THEN duration_sec ELSE 0 END) AS minutes
     FROM call_logs WHERE date(started_at) = date('now')`
  );
  return row[0];
}

async function buildRecentCalls(db, limit = 10) {
  return db.all(
    `SELECT c.*, u1.display_name AS caller_name, u2.display_name AS callee_name
     FROM call_logs c
     JOIN users u1 ON u1.id = c.caller_id
     JOIN users u2 ON u2.id = c.callee_id
     ORDER BY c.id DESC LIMIT ?`,
    [limit]
  );
}

export async function handleCommand(db, text) {
  const [command, ...args] = String(text || '').trim().split(/\s+/);

  switch (command) {
    case '/stats': {
      const s = await buildStats(db);
      const minutes = Math.round((s.minutes || 0) / 60);
      return sendMessage(
        `📊 <b>All-time stats</b>\n` +
          `Total calls: ${s.total || 0}\n` +
          `Answered: ${s.answered || 0} · Declined: ${s.declined || 0} · Missed: ${s.missed || 0}\n` +
          `Talk time: ${minutes} min`
      );
    }
    case '/today': {
      const t = await buildTodayStats(db);
      return sendMessage(
        `📅 <b>Today</b>\nCalls: ${t.total || 0}\nTalk time: ${Math.round((t.minutes || 0) / 60)} min`
      );
    }
    case '/calls': {
      const limit = Math.min(parseInt(args[0], 10) || 10, 20);
      const calls = await buildRecentCalls(db, limit);
      if (!calls.length) return sendMessage('No calls recorded yet.');
      const lines = calls.map((c) => formatCallMessage(c));
      return sendMessage(`🗒 <b>Last ${calls.length} calls</b>\n\n${lines.join('\n\n')}`);
    }
    case '/start':
    case '/help':
      return sendMessage(
        '🤖 <b>VoiceCall tracker</b>\n\n' +
          '/stats — all-time statistics\n' +
          '/today — today\'s calls\n' +
          '/calls [n] — last n calls (default 10)\n\n' +
          'You will also receive a message after every call.'
      );
    default:
      return true;
  }
}

let polling = false;

export function startBot(db) {
  if (!isConfigured()) {
    console.log('[telegram] Bot not configured (set TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID)');
    return;
  }
  let offset = 0;
  let failedPolls = 0;

  async function poll() {
    try {
      const res = await fetch(
        `${API}/bot${BOT_TOKEN}/getUpdates?offset=${offset + 1}&timeout=30`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      failedPolls = 0;
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id;
          const message = update.message || update.channel_post;
          if (message && message.text) {
            await handleCommand(db, message.text);
          }
        }
      }
    } catch (err) {
      failedPolls += 1;
      console.error('[telegram] polling error:', err.message);
    }
    const delay = Math.min(1000 * 2 ** failedPolls, 30000);
    setTimeout(poll, delay);
  }

  if (!polling) {
    polling = true;
    poll();
    console.log('[telegram] Bot started (long-polling)');
  }
}