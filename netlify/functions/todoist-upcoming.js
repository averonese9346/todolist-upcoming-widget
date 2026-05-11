// Netlify Function: todoist-upcoming.js
// Uses global fetch (Node 18+). Make sure TODOIST_TOKEN is set in Netlify env vars.

exports.handler = async function(event, context) {
  const token = process.env.TODOIST_TOKEN;
  if (!token) {
    return { statusCode: 500, body: 'Missing TODOIST_TOKEN environment variable' };
  }

  try {
    // Use the supported REST endpoint for tasks
    const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const txt = await res.text();
      // Return the API message so you can see the exact problem in the browser
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: 'Todoist API error: ' + txt
      };
    }

    const tasks = await res.json();

    // Determine current month and year in local time
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();

    // Filter tasks that have a due date in this month
    const tasksThisMonth = tasks.filter(t => {
      if (!t.due || !t.due.date) return false;
      // Todoist may return date-only (YYYY-MM-DD) or datetime; Date handles both
      const d = new Date(t.due.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    // Sort by due date
    tasksThisMonth.sort((a,b) => new Date(a.due.date) - new Date(b.due.date));

    // Build HTML
    let html = '';
    if (tasksThisMonth.length === 0) {
      html = '<p>No tasks with due dates this month.</p>';
    } else {
      html = tasksThisMonth.map(t => {
        const d = new Date(t.due.date);
        const dateStr = d.toLocaleString(undefined, { year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
        return `<div class="task"><div><strong>${escapeHtml(t.content)}</strong></div><div class="date">${dateStr}</div></div>`;
      }).join('');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': "frame-ancestors 'self' https://dashly.live",
      },
      body: html
    };

  } catch (err) {
    return { statusCode: 500, body: 'Server error: ' + String(err) };
  }
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

