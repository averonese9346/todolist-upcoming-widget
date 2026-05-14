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
      `&hourly=temperature_2m,apparent_temperature,weathercode` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
      `&temperature_unit=fahrenheit` +
      `&windspeed_unit=mph` +
      `&timezone=auto`;

    const res = await fetch(url);
    const data = await res.json();

    const current = data.current_weather;
    const hourly = data.hourly;
    const daily = data.daily;

    // Weather icon mapping (Open-Meteo weather codes)
    const iconMap = (code) => {
      if ([0].includes(code)) return "☀️";
      if ([1,2].includes(code)) return "🌤️";
      if ([3].includes(code)) return "☁️";
      if ([45,48].includes(code)) return "🌫️";
      if ([51,53,55,61,63,65].includes(code)) return "🌧️";
      if ([71,73,75].includes(code)) return "❄️";
      if ([95,96,99].includes(code)) return "⛈️";
      return "🌡️";
    };

    // Next 6 hourly points
    const nowIndex = hourly.time.findIndex(t => t.startsWith(new Date().toISOString().slice(0, 13)));

    const hourlyHTML = hourly.time.slice(nowIndex, nowIndex + 6).map((t, i) => `
      <div style="display:flex;justify-content:space-between;padding:4px 0;">
        <span>${new Date(t).getHours()}:00</span>
        <span>${iconMap(hourly.weathercode[nowIndex + i])}</span>
        <span>${hourly.temperature_2m[nowIndex + i]}°F</span>
        <span style="opacity:0.7">feels ${hourly.apparent_temperature[nowIndex + i]}°F</span>
      </div>
    `).join('');

    const html = `
      <div style="font-family: Arial; padding: 12px;">
        <h3>${loc.name}</h3>

        <div style="font-size: 28px; font-weight: bold;">
          ${iconMap(current.weathercode)} ${current.temperature}°F
        </div>

        <div>💨 Wind: ${current.windspeed} mph</div>

        <hr />

        <div>
          <strong>Next 6 Hours</strong>
          ${hourlyHTML}
        </div>

        <hr />

        <div>
          <strong>5-Day Forecast</strong>
          <ul style="padding-left: 16px;">
            ${daily.time.slice(0, 5).map((day, i) => `
              <li>
                ${iconMap(daily.weathercode[i])}
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
