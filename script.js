const config = {
  cUrl: "https://api.countrystatecity.in/v1/countries",
  cKey: "R3NUdUE3RTdlbWt5ckF3WEJLMkFwQ0VJWDNUaThLUGdrU09VZEhuaA==",
  wUrl: "https://api.openweathermap.org/data/2.5/",
  wKey: "b3d134b205a02dd2324b79cea375c67e",
};

const getCountries = async (type, ...args) => {
  let url;
  switch (type) {
    case "countries": url = config.cUrl; break;
    case "states": url = `${config.cUrl}/${args[0]}/states`; break;
    case "cities": url = `${config.cUrl}/${args[0]}/states/${args[1]}/cities`; break;
  }

  const res = await fetch(url, { headers: { "X-CSCAPI-KEY": config.cKey } });
  if (!res.ok) throw new Error("Failed to load data");
  return await res.json();
};

const getWeather = async (city, country, unit = "metric") => {
  const res = await fetch(`${config.wUrl}weather?q=${city},${country.toLowerCase()}&APPID=${config.wKey}&units=${unit}`);
  if (!res.ok) throw new Error("Weather data unavailable");
  return await res.json();
};

const getDateTime = (ts) => {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
};

const tempCard = (val, unit = "cel") => {
  const u = unit === "far" ? "°F" : "°C";
  return `<div id="tempcard">
    <h6 class="card-subtitle mb2 ${unit}">${val.temp}</h6>
    <p class="card-text">Feels Like: ${val.feels_like} ${u}</p>
    <p class="card-text">Max: ${val.temp_max} ${u}, Min: ${val.temp_min} ${u}</p>
  </div>`;
};

const displayWeather = (data) => {
  const widget = `<div class="card">
    <div class="card-body">
      <h5 class="card-title">${data.name}, ${data.sys.country}
        <span class="float-end units">
          <a href="#" class="unitlink active" data-unit="cel">°C</a> |
          <a href="#" class="unitlink" data-unit="far">°F</a>
        </span>
      </h5>
      <p>${getDateTime(data.dt)}</p>
      <div id="tempcard">${tempCard(data.main)}</div>
      ${data.weather.map(w => `
        <div>${w.main} <img src="https://openweathermap.org/img/wn/${w.icon}.png" /></div>
        <p>${w.description}</p>`).join("")}
    </div>
  </div>`;
  document.querySelector("#weatherwidget").innerHTML = widget;
};

const getLoader = () => {
  return `<div class="spinner-grow text-info" role="status"><span class="visually-hidden">Loading...</span></div>`;
};

const countryList = document.querySelector("#countrylist");
const stateList = document.querySelector("#statelist");
const cityList = document.querySelector("#citylist");
const weatherDiv = document.querySelector("#weatherwidget");

let commentList = [];
let historyList = JSON.parse(localStorage.getItem("weatherHistory")) || [];

document.addEventListener("DOMContentLoaded", async () => {
  const countries = await getCountries("countries");
  countryList.innerHTML = `<option value="">Country</option>` + countries.map(c => `<option value="${c.iso2}">${c.name}</option>`).join("");

  countryList.addEventListener("change", async () => {
    const states = await getCountries("states", countryList.value);
    stateList.innerHTML = `<option value="">State</option>` + states.map(s => `<option value="${s.iso2}">${s.name}</option>`).join("");
    stateList.disabled = false;
  });

  stateList.addEventListener("change", async () => {
    const cities = await getCountries("cities", countryList.value, stateList.value);
    cityList.innerHTML = `<option value="">City</option>` + cities.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
    cityList.disabled = false;
  });

  cityList.addEventListener("change", async () => {
    const country = countryList.value;
    const city = cityList.value;
    weatherDiv.innerHTML = getLoader();
    const weather = await getWeather(city, country);
    displayWeather(weather);

    historyList.push({
      city: city,
      country: country,
      temp: weather.main.temp,
      time: new Date().toLocaleTimeString()
    });
    localStorage.setItem("weatherHistory", JSON.stringify(historyList));
  });

  document.addEventListener("click", async e => {
    if (e.target.classList.contains("unitlink")) {
      e.preventDefault();
      const unit = e.target.getAttribute("data-unit");
      const units = unit === "far" ? "imperial" : "metric";
      const city = cityList.value;
      const country = countryList.value;
      const weather = await getWeather(city, country, units);
      document.querySelector("#tempcard").innerHTML = tempCard(weather.main, unit);
      document.querySelectorAll(".unitlink").forEach(l => l.classList.remove("active"));
      e.target.classList.add("active");
    }
  });
});

// Comments & History UI
document.querySelector("#commentBtn").addEventListener("click", () => {
  document.querySelector("#commentSection").style.display = "block";
  document.querySelector("#historySection").style.display = "none";
});

document.querySelector("#historyBtn").addEventListener("click", () => {
  document.querySelector("#commentSection").style.display = "none";
  document.querySelector("#historySection").style.display = "block";
  updateHistoryUI();
});

document.querySelector("#submitComment").addEventListener("click", () => {
  const input = document.querySelector("#commentInput");
  if (input.value.trim()) {
    commentList.push({ text: input.value.trim(), time: new Date().toLocaleTimeString() });
    input.value = "";
    updateCommentsUI();
  }
});

const updateCommentsUI = () => {
  const ul = document.querySelector("#commentList");
  ul.innerHTML = "";
  commentList.forEach((c, index) => {
    const li = document.createElement("li");
    li.innerHTML = `${c.text} <span class="text-muted">(${c.time})</span>
      <button class="delete-btn" onclick="deleteComment(${index})">x</button>`;
    ul.appendChild(li);
  });
};

const updateHistoryUI = () => {
  const ul = document.querySelector("#historyList");
  ul.innerHTML = "";
  historyList.forEach((h, i) => {
    const li = document.createElement("li");
    li.innerHTML = `${h.city}, ${h.country} - ${h.temp}°C at ${h.time}
      <button class="delete-btn" onclick="deleteHistory(${i})">x</button>`;
    ul.appendChild(li);
  });
};

window.deleteHistory = (i) => {
  historyList.splice(i, 1);
  localStorage.setItem("weatherHistory", JSON.stringify(historyList));
  updateHistoryUI();
};

window.deleteComment = (i) => {
  commentList.splice(i, 1);
  updateCommentsUI();
};
