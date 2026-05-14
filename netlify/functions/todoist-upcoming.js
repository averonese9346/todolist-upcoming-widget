// Netlify Function: todoist-upcoming.js
// Requires TODOIST_TOKEN in Netlify environment variables
// Uses Todoist API v1

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
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        },
        body: 'Todoist API error: ' + txt
      };
    }

    const tasks = await res.json();

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
          ? dueDate.toLocaleString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })
          : dueDate.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });

        return `
          <div class="task">
            <div><strong>${escapeHtml(task.content)}</strong></div>
            <div class="date">${dateStr}</div>
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
      body: 'Server error: ' + String(err)
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
