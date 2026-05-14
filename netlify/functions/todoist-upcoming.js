// Netlify Function: todoist-upcoming.js
// Requires TODOIST_TOKEN in Netlify environment variables

exports.handler = async function(event, context) {
  const token = process.env.TODOIST_TOKEN;

  if (!token) {
    return {
      statusCode: 500,
      body: 'Missing TODOIST_TOKEN environment variable'
    };
  }

  try {
    const res = await fetch('https://api.todoist.com/api/v1/tasks', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const txt = await res.text();
      return {
        statusCode: 500,
        body: 'Todoist API error: ' + txt
      };
    }

    const data = await res.json();

    // Todoist v1 wraps tasks inside "results"
    const tasks = Array.isArray(data) ? data : data.results || [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const tasksThisMonth = tasks.filter(task => {
      if (!task.due || (!task.due.date && !task.due.datetime)) {
        return false;
      }

      const dueDate = new Date(task.due.datetime || task.due.date);

      return (
        dueDate.getFullYear() === currentYear &&
        dueDate.getMonth() === currentMonth
      );
    });

    tasksThisMonth.sort((a, b) => {
      const dateA = new Date(a.due.datetime || a.due.date);
      const dateB = new Date(b.due.datetime || b.due.date);
      return dateA - dateB;
    });

    let html = '';

    if (tasksThisMonth.length === 0) {
      html = '<p>No tasks due this month.</p>';
    } else {
      html = tasksThisMonth.map(task => {
        const dueDate = new Date(task.due.datetime || task.due.date);

        const dateStr = task.due.datetime
          ? dueDate.toLocaleString()
          : dueDate.toLocaleDateString();

        return `
          <div class="task" style="padding:10px;border-bottom:1px solid #ddd;">
            <div><strong>${escapeHtml(task.content)}</strong></div>
            <div style="font-size:0.9em;color:#666;">${dateStr}</div>
          </div>
        `;
      }).join('');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      },
      body: html
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: 'Server error: ' + err.message
    };
  }
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}
