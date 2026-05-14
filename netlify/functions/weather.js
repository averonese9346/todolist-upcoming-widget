exports.handler = async function (event) {
  const location = event.queryStringParameters?.location;

  const locations = {
    ingleside: { lat: 42.3817, lon: -88.1531, name: "Ingleside, IL" },
    chicago: { lat: 41.8781, lon: -87.6298, name: "Chicago, IL" }
  };

  const loc = locations[location];

  if (!loc) {
    return {
      statusCode: 400,
      body: "Invalid location. Use 'ingleside' or 'chicago'."
    };
  }

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${loc.lat}&longitude=${loc.lon}` +
      `&current_weather=true` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&temperature_unit=fahrenheit` +
      `&windspeed_unit=mph` +
      `&timezone=auto`;

    const res = await fetch(url);
    const data = await res.json();

    const current = data.current_weather;
    const daily = data.daily;

    const html = `
      <div style="font-family: Arial; padding: 12px;">
        <h3>${loc.name}</h3>

        <div style="font-size: 28px; font-weight: bold;">
          ${current.temperature}°F
        </div>

        <div>Wind: ${current.windspeed} mph</div>

        <hr />

        <div>
          <strong>5-Day Forecast</strong>
          <ul style="padding-left: 16px;">
            ${daily.time.slice(0, 5).map((day, i) => `
              <li>
                ${day}: ${daily.temperature_2m_min[i]}°F / ${daily.temperature_2m_max[i]}°F
                — ${daily.precipitation_probability_max[i]}% rain
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      },
      body: html
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: "Weather error: " + err.message
    };
  }
};
