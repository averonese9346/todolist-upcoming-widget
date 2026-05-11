// Netlify Function: todoist-upcoming.js
// Simple serverless function that fetches Todoist tasks and returns HTML for the current month.
// Make sure you set TODOIST_TOKEN in Netlify environment variables.

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const token = process.env.TODOIST_TOKEN;
  if (!token) {
    return { statusCode: 500, body: 'Missing TODOIST_TOKEN environment variable' };
  }

  try {
    // Fetch all active tasks
    const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const txt = await res.text();
      return { statusCode: 500, body: 'Todoist API error: ' + txt };
    }
    const tasks = await res.json();

    // Determine current month and year in local time
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();

    // Filter tasks that have a due date in this month
    const tasksThisMonth = tasks.filter(t => {
      if (!t.due || !t.due.date) return false;
      const d = new Date(t.due.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    // Sort by due date
    tasksThisMonth.sort((a,b) => {
      const da = new Date(a.due.date);
      const db = new Date(b.due.date);
      return da - db;
    });

    // Build HTML
    let html = '';
    if (tasksThisMonth.length === 0) {
      html = '<p>No tasks with due dates this month.</p>';
    } else {
      html = tasksThisMonth.map(t => {
        const d = new Date(t.due.date);
        const dateStr = d.toLocaleString(undefined, { year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
        const project = t.project_id ? `Project ${t.project_id}` : '';
        return `<div class="task"><div><strong>${escapeHtml(t.content)}</strong></div><div class="date">${dateStr} ${project}</div></div>`;
      }).join('');
    }

    // Return HTML with headers that allow framing in Dashly
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
