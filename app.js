const state = {
  data: null,
  chartMetric: "members",
  openServiceAreas: new Set(),
};

const fmt = new Intl.NumberFormat("en-US");
const one = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const pct = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
const signedPct = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1, signDisplay: "always" });
const signedNum = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, signDisplay: "always" });

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

function n(value) {
  return value == null || Number.isNaN(value) ? "n/a" : fmt.format(value);
}

function p(value) {
  return value == null || Number.isNaN(value) ? "n/a" : pct.format(value);
}

function sp(value) {
  return value == null || Number.isNaN(value) ? "n/a" : signedPct.format(value);
}

function metric(value) {
  return value == null || Number.isNaN(value) ? "n/a" : one.format(value);
}

function statusClass(status) {
  if (status === "On Track") return "good";
  if (status === "Monitor") return "warn";
  return "bad";
}

function serviceAreaGroups(rows) {
  const source = state.data.dashboard.service_areas || [];
  const sourceByName = new Map(source.map((area, index) => [area.service_area, { ...area, index }]));
  const groups = new Map();
  for (const row of rows) {
    const name = row.service_area || "Unassigned";
    if (!groups.has(name)) {
      const sourceRow = sourceByName.get(name) || {};
      groups.set(name, {
        name,
        fieldDirector: sourceRow.field_director || row.service_area_field_director || "",
        order: sourceRow.service_area_order ?? row.service_area_order ?? sourceRow.index ?? 99,
        rows: [],
      });
    }
    groups.get(name).rows.push(row);
  }
  return [...groups.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

function serviceAreaSummary(rows, key) {
  if (!rows.length) return null;
  if (key === "status") {
    const counts = rows.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }
  if (key === "avg_metric") {
    const units = rows.reduce((total, row) => total + (row.units || 0), 0);
    return units ? rows.reduce((total, row) => total + (row.avg_metric || 0) * (row.units || 0), 0) / units : null;
  }
  if (key === "yoy_pct") {
    const lastYear = rows.reduce((total, row) => total + (row.last_year_members || 0), 0);
    const delta = rows.reduce((total, row) => total + (row.yoy_delta || 0), 0);
    return lastYear ? delta / lastYear : null;
  }
  if (key === "at_risk_rate") {
    const units = rows.reduce((total, row) => total + (row.units || 0), 0);
    const atRisk = rows.reduce((total, row) => total + (row.at_risk_units || 0), 0);
    return units ? atRisk / units : null;
  }
  if (key === "assigned_pct") {
    const units = rows.reduce((total, row) => total + (row.units || 0), 0);
    const assigned = rows.reduce((total, row) => total + (row.assigned_pct || 0) * (row.units || 0), 0);
    return units ? assigned / units : null;
  }
  if (key === "syt_pct" || key === "training_pct") {
    const members = rows.reduce((total, row) => total + (row.members || 0), 0);
    return members ? rows.reduce((total, row) => total + (row[key] || 0) * (row.members || 0), 0) / members : null;
  }
  return rows.reduce((total, row) => total + (row[key] || 0), 0);
}

function currentDistricts() {
  const { data } = state;
  const district = document.getElementById("districtSelect").value;
  const status = document.getElementById("statusSelect").value;
  const q = document.getElementById("searchInput").value.trim().toLowerCase();

  return data.dashboard.districts.filter((row) => {
    const haystack = [
      row.district,
      row.district_commissioner,
      row.field_exec,
    ].join(" ").toLowerCase();
    return (!district || row.district === district)
      && (!status || row.status === status)
      && (!q || haystack.includes(q));
  });
}

function matchingPriorityUnits() {
  const { data } = state;
  const district = document.getElementById("districtSelect").value;
  const q = document.getElementById("searchInput").value.trim().toLowerCase();

  return data.dashboard.priority_units.filter((row) => {
    const haystack = [
      row.district,
      row.unit,
      ...(row.commissioners || []),
      row.pin_status,
    ].join(" ").toLowerCase();
    return (!district || row.district === district) && (!q || haystack.includes(q));
  });
}

function matchingCommissioners() {
  const { data } = state;
  const district = document.getElementById("districtSelect").value;
  const q = document.getElementById("searchInput").value.trim().toLowerCase();

  return data.dashboard.commissioners.filter((row) => {
    const haystack = [
      row.district,
      row.name,
      row.position,
      row.assigned_units,
      row.unit_health,
    ].join(" ").toLowerCase();
    return (!district || row.district === district) && (!q || haystack.includes(q));
  });
}

function renderMeta() {
  const data = state.data;
  const generated = new Date(data.generated_at);
  document.getElementById("generatedDate").textContent = Number.isNaN(generated.getTime())
    ? data.generated_date
    : generated.toLocaleString();
  document.getElementById("sourceLine").textContent = `${data.dashboard.source_name} + ${data.cst.source_name}`;
}

function renderControls() {
  const options = state.data.dashboard.districts
    .map((row) => `<option value="${esc(row.district)}">${esc(row.district)}</option>`)
    .join("");
  document.getElementById("districtSelect").innerHTML = `<option value="">All districts</option>${options}`;
}

function renderKpis() {
  const c = state.data.dashboard.council;
  const cap = state.data.cst.capitol || {};
  const tiles = [
    ["Youth", n(c.members), `${signedNum.format(c.yoy_delta || 0)} YoY (${sp(c.yoy_pct)})`, c.yoy_delta >= 0 ? "good" : "warning"],
    ["Units", n(c.units), `${n(c.at_risk_units)} at-risk units`, "danger"],
    ["Avg Metric", metric(c.avg_metric), `${p(c.healthy_rate)} at metric 4-5`, "teal"],
    ["Assigned", p(c.assigned_pct), `${n(c.assigned_units)} assigned units`, "good"],
    ["Training", p(c.training_pct), "All scouter training", "warning"],
    ["CST7 Rank", cap.yoy_rank ? `#${metric(cap.yoy_rank)}` : "n/a", "CAC YoY rank in territory", "teal"],
  ];

  document.getElementById("kpiGrid").innerHTML = tiles.map(([label, value, sub, tone]) => `
    <article class="kpi ${tone}">
      <div>
        <div class="kpi-label">${esc(label)}</div>
        <div class="kpi-value">${esc(value)}</div>
      </div>
      <div class="kpi-sub">${esc(sub)}</div>
    </article>
  `).join("");
}

function renderDistrictChart() {
  const rows = [...currentDistricts()];
  const key = state.chartMetric;
  const max = Math.max(...rows.map((row) => row[key] || 0), key.includes("pct") || key.includes("rate") ? 1 : 0);
  const labels = {
    members: ["Youth", (v) => n(v)],
    at_risk_rate: ["At-risk rate", (v) => p(v)],
    assigned_pct: ["Assigned", (v) => p(v)],
    training_pct: ["Training", (v) => p(v)],
  };
  const formatter = labels[key][1];

  rows.sort((a, b) => (b[key] || 0) - (a[key] || 0));
  document.getElementById("districtChart").innerHTML = rows.map((row) => {
    const value = row[key] || 0;
    const width = max ? Math.max(2, (value / max) * 100) : 2;
    const risk = key === "at_risk_rate" ? " risk" : "";
    return `
      <div class="bar-row">
        <div class="bar-label">${esc(row.district)}<span>${esc(row.status)}</span></div>
        <div class="meter" aria-label="${esc(row.district)} ${esc(labels[key][0])}">
          <div class="meter-fill${risk}" style="width: ${width}%"></div>
        </div>
        <div class="bar-value">${formatter(value)}</div>
      </div>
    `;
  }).join("");
}

function renderSignals() {
  const data = state.data;
  const c = data.dashboard.council;
  const worstRisk = [...data.dashboard.districts].sort((a, b) => (b.at_risk_rate || 0) - (a.at_risk_rate || 0))[0];
  const bestGrowth = [...data.dashboard.districts].sort((a, b) => (b.yoy_pct || 0) - (a.yoy_pct || 0))[0];
  const weakestTraining = [...data.dashboard.districts].sort((a, b) => (a.training_pct || 0) - (b.training_pct || 0))[0];
  const unassigned = Math.max(0, (c.units || 0) - (c.assigned_units || 0));
  const unitCommissioners = data.dashboard.commissioners.filter((row) => /unit commissioner/i.test(row.position || "")).length;

  const cards = [
    [`${n(unassigned)} units need assignment`, `${p(c.assigned_pct)} of units currently have commissioner assignment.`],
    [`${esc(worstRisk.district)} has highest risk`, `${p(worstRisk.at_risk_rate)} of units are in the 0-2 metric band.`],
    [`${esc(bestGrowth.district)} leads growth`, `${sp(bestGrowth.yoy_pct)} year over year, with ${n(bestGrowth.members)} youth.`],
    [`${n(unitCommissioners)} unit commissioners`, `${n(c.units)} units and ${n(data.dashboard.priority_units.length)} priority units in the commissioner work queue.`],
    [`Training gap: ${esc(weakestTraining.district)}`, `${p(weakestTraining.training_pct)} all-scouter training completion.`],
  ];

  document.getElementById("signals").innerHTML = cards.map(([title, body]) => `
    <article class="signal"><strong>${title}</strong><p>${body}</p></article>
  `).join("");
}

function miniMeter(value, tone = "") {
  const width = Math.max(0, Math.min(100, (value || 0) * 100));
  return `<span class="mini-meter"><span class="meter"><span class="meter-fill ${tone}" style="width:${width}%"></span></span><span class="subtle">${p(value)}</span></span>`;
}

function renderDistrictRows() {
  const rows = currentDistricts().sort((a, b) => (b.at_risk_rate || 0) - (a.at_risk_rate || 0));
  const forceOpen = Boolean(document.getElementById("districtSelect").value || document.getElementById("searchInput").value.trim());
  document.getElementById("districtRows").innerHTML = serviceAreaGroups(rows).map((service) => {
    const open = forceOpen || state.openServiceAreas.has(service.name);
    const status = serviceAreaSummary(service.rows, "status");
    const atRiskUnits = serviceAreaSummary(service.rows, "at_risk_units");
    const units = serviceAreaSummary(service.rows, "units");
    const serviceRow = `
      <tr class="service-area-row" data-service-area="${esc(service.name)}" aria-expanded="${open ? "true" : "false"}">
        <td><button class="service-toggle" type="button" data-service-area="${esc(service.name)}"><span class="disclosure">${open ? "-" : "+"}</span><strong>${esc(service.name)}</strong></button><div class="subtle">${n(service.rows.length)} districts · ${esc(service.fieldDirector || "No field director")}</div></td>
        <td><span class="status ${statusClass(status)}">${esc(status)}</span></td>
        <td class="num">${n(serviceAreaSummary(service.rows, "members"))}</td>
        <td class="num">${sp(serviceAreaSummary(service.rows, "yoy_pct"))}</td>
        <td class="num">${metric(serviceAreaSummary(service.rows, "avg_metric"))}</td>
        <td class="num">${miniMeter(serviceAreaSummary(service.rows, "at_risk_rate"), "risk")}<div class="subtle">${n(atRiskUnits)} / ${n(units)}</div></td>
        <td class="num">${miniMeter(serviceAreaSummary(service.rows, "assigned_pct"))}</td>
        <td class="num">${p(serviceAreaSummary(service.rows, "syt_pct"))}</td>
        <td class="num">${p(serviceAreaSummary(service.rows, "training_pct"))}</td>
        <td>${esc(service.fieldDirector || "TBA")}<div class="subtle">Service Area</div></td>
      </tr>
    `;
    const districtRows = open ? service.rows.map((row) => `
    <tr>
      <td><strong>${esc(row.district)}</strong><div class="subtle">${n(row.units)} units</div></td>
      <td><span class="status ${statusClass(row.status)}">${esc(row.status)}</span></td>
      <td class="num">${n(row.members)}</td>
      <td class="num">${sp(row.yoy_pct)}</td>
      <td class="num">${metric(row.avg_metric)}</td>
      <td class="num">${miniMeter(row.at_risk_rate, "risk")}</td>
      <td class="num">${miniMeter(row.assigned_pct)}</td>
      <td class="num">${p(row.syt_pct)}</td>
      <td class="num">${p(row.training_pct)}</td>
      <td>${esc(row.district_commissioner || "N/A")}<div class="subtle">${esc(row.field_exec || "")}</div></td>
    </tr>
  `).join("") : "";
    return serviceRow + districtRows;
  }).join("");
}

function renderPriorityRows() {
  const rows = matchingPriorityUnits().sort((a, b) => (a.metric || 0) - (b.metric || 0));
  document.getElementById("priorityCount").textContent = `${rows.length} shown`;
  document.getElementById("priorityRows").innerHTML = rows.map((row) => `
    <tr>
      <td>${esc(row.district)}</td>
      <td><strong>${esc(row.unit)}</strong><div class="subtle">${esc(row.unit_type || "")}</div></td>
      <td class="num">${metric(row.metric)}</td>
      <td class="num">${n(row.youth)}</td>
      <td>${esc((row.commissioners || []).join(", ") || "Unassigned")}</td>
      <td>${esc(row.pin_status || "n/a")}</td>
    </tr>
  `).join("");
}

function renderCoverage() {
  const data = state.data;
  const c = data.dashboard.council;
  const trained = data.dashboard.commissioners.filter((row) => row.trained).length;
  const withAssignments = data.dashboard.commissioners.filter((row) => row.assigned_units).length;
  const unitCommissioners = data.dashboard.commissioners.filter((row) => /unit commissioner/i.test(row.position || "")).length;
  const cards = [
    ["Registered commissioners", n(c.commissioners), "Total commissioner records in the dashboard extract."],
    ["Unit commissioners", n(unitCommissioners), `${n(c.units)} council units for coverage planning.`],
    ["Commissioners trained", p(trained / Math.max(1, data.dashboard.commissioners.length)), `${n(trained)} trained records.`],
    ["With assignments", p(withAssignments / Math.max(1, data.dashboard.commissioners.length)), `${n(withAssignments)} commissioners list assigned units.`],
  ];

  document.getElementById("coverage").innerHTML = cards.map(([label, value, body]) => `
    <article class="coverage-item"><strong>${esc(value)} ${esc(label)}</strong><p>${esc(body)}</p></article>
  `).join("");
}

function renderCommissionerRows() {
  const rows = matchingCommissioners().sort((a, b) => {
    const districtCompare = String(a.district || "").localeCompare(String(b.district || ""));
    return districtCompare || String(a.name || "").localeCompare(String(b.name || ""));
  });
  document.getElementById("commissionerCount").textContent = `${rows.length} shown`;
  document.getElementById("commissionerRows").innerHTML = rows.map((row) => `
    <tr>
      <td>${esc(row.district || "")}</td>
      <td><strong>${esc(row.name || "")}</strong></td>
      <td>${esc(row.position || "")}</td>
      <td><span class="status ${row.trained ? "good" : "bad"}">${row.trained ? "Yes" : "No"}</span></td>
      <td>${row.syt_expires ? esc(new Date(row.syt_expires).toLocaleDateString()) : "n/a"}</td>
      <td>${esc(row.assigned_units || "None listed")}</td>
      <td>${esc(row.unit_health || "n/a")}</td>
    </tr>
  `).join("");
}

function renderTerritory() {
  const councils = state.data.cst.councils
    .filter((row) => row.council && row.members != null && !/^CST 7$/.test(row.council))
    .sort((a, b) => (b.members || 0) - (a.members || 0))
    .slice(0, 8);

  document.getElementById("territoryGrid").innerHTML = councils.map((row) => `
    <article class="territory-card">
      <strong>${esc(row.council.replace(" Council", ""))}</strong>
      <p>${n(row.members)} youth, ${n(row.units)} units</p>
      <p>YoY ${sp(row.yoy_pct)} ${row.yoy_rank ? `(#${metric(row.yoy_rank)})` : ""}</p>
      <p>Avg metric ${metric(row.avg_metric)}</p>
    </article>
  `).join("");
}

function renderSources() {
  const data = state.data;
  const sources = [
    ["Commissioner dashboard workbook", data.dashboard.source_name, data.dashboard.source_mtime, data.dashboard.source],
    ["CST7 metric workbook", data.cst.source_name, data.cst.source_mtime, data.cst.source],
  ];

  document.getElementById("sourcesGrid").innerHTML = sources.map(([label, name, mtime, path]) => `
    <article class="source-card">
      <strong>${esc(label)}</strong>
      <p>${esc(name || "n/a")}</p>
      <p>Updated ${mtime ? esc(new Date(mtime).toLocaleString()) : "n/a"}</p>
      <p class="subtle">${esc(path || "")}</p>
    </article>
  `).join("");
}

function renderAll() {
  renderKpis();
  renderDistrictChart();
  renderSignals();
  renderDistrictRows();
  renderPriorityRows();
  renderCoverage();
  renderCommissionerRows();
  renderTerritory();
  renderSources();
}

function bindEvents() {
  ["districtSelect", "statusSelect", "searchInput"].forEach((id) => {
    document.getElementById(id).addEventListener("input", renderAll);
  });

  document.querySelectorAll("[data-chart-metric]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-chart-metric]").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      state.chartMetric = button.dataset.chartMetric;
      renderDistrictChart();
    });
  });

  document.getElementById("districtRows").addEventListener("click", (event) => {
    const button = event.target.closest(".service-toggle");
    if (!button) return;
    const name = button.dataset.serviceArea;
    if (state.openServiceAreas.has(name)) state.openServiceAreas.delete(name);
    else state.openServiceAreas.add(name);
    renderDistrictRows();
  });
}

async function init() {
  const response = await fetch("https://pbsargent.github.io/council-dashboard-summary/data/latest.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load dashboard data: ${response.status}`);
  state.data = await response.json();
  renderMeta();
  renderControls();
  bindEvents();
  renderAll();
}

init().catch((error) => {
  document.querySelector("main").innerHTML = `
    <section class="panel">
      <h1>Dashboard data did not load</h1>
      <p>${esc(error.message)}</p>
      <p class="subtle">Run this dashboard from a local web server or static host so it can read the Council Summary latest data.</p>
    </section>
  `;
});
