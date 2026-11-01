const fileInput = document.getElementById("fileInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusEl = document.getElementById("status");
const deviationEl = document.getElementById("deviation");
const riskEl = document.getElementById("risk");
const detailsEl = document.getElementById("details");
const chartEl = document.getElementById("chart");
let chart = null;

window.addEventListener("resize", () => {
  if (chart) chart.resize();
});

function setStatus(text) {
  statusEl.textContent = `状态: ${text}`;
}

function cssToken(name, fallback) {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  } catch (_e) {
    return fallback;
  }
}

function ensurePapa(featureName) {
  const ok = !!(window.Papa && typeof window.Papa.parse === "function");
  if (ok) return true;
  setStatus(`依赖未加载：PapaParse（${featureName}不可用）。可能网络不可用或 CDN 被拦截。`);
  return false;
}

function ensureChart() {
  if (chart) return chart;
  if (!chartEl) return null;
  if (!window.echarts || typeof window.echarts.init !== "function") return null;
  try {
    chart = window.echarts.init(chartEl);
    return chart;
  } catch (_e) {
    return null;
  }
}

function benfordExpected() {
  const arr = [];
  for (let d = 1; d <= 9; d += 1) {
    arr.push(Math.log10(1 + 1 / d));
  }
  return arr;
}

function leadingDigit(value) {
  const n = Math.abs(Number(value));
  if (!Number.isFinite(n) || n === 0) return null;
  const str = n.toString().replace(/^0+/, "");
  const m = str.match(/[1-9]/);
  return m ? Number(m[0]) : null;
}

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    if (!ensurePapa("CSV 解析")) {
      reject(new Error("CSV 解析依赖未加载（PapaParse）"));
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: r => resolve(r),
      error: e => reject(e)
    });
  });
}

function inferNumericColumn(rows, headers) {
  return headers.find(h => rows.some(r => Number.isFinite(Number(r[h]))));
}

analyzeBtn.addEventListener("click", async () => {
  const file = fileInput.files?.[0];
  if (!file) {
    setStatus("请先选择 CSV 文件");
    return;
  }
  setStatus("解析中...");
  try {
    const res = await parseCsv(file);
    const rows = res.data || [];
    const headers = res.meta.fields || Object.keys(rows[0] || {});
    const col = inferNumericColumn(rows, headers);
    if (!col) {
      setStatus("未找到可分析数值列");
      return;
    }

    const counts = Array(9).fill(0);
    let total = 0;
    rows.forEach(r => {
      const d = leadingDigit(r[col]);
      if (d) {
        counts[d - 1] += 1;
        total += 1;
      }
    });

    if (!total) {
      setStatus("数值不足，无法计算");
      return;
    }

    const actual = counts.map(c => c / total);
    const expected = benfordExpected();
    const deviation = actual.reduce((sum, a, i) => sum + Math.abs(a - expected[i]), 0);

    const c = ensureChart();
    if (c) {
      const ink = cssToken("--ink", "#3A2E20");
      const cinnabar = cssToken("--cinnabar", "#A2402F");
      const gold = cssToken("--gold", "#8C6A2F");
      const line = cssToken("--line", "#D3C4A0");
      c.setOption({
        backgroundColor: "transparent",
        title: { text: `列 "${col}" Benford 对比`, left: 0, top: 0, textStyle: { color: ink, fontSize: 14, fontWeight: 600 } },
        tooltip: { trigger: "axis" },
        legend: { data: ["实际", "理论"], top: 28, left: 0, textStyle: { color: ink } },
        grid: { top: 72, right: 12, bottom: 8, left: 8, containLabel: true },
        xAxis: {
          type: "category",
          data: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
          axisLabel: { color: ink },
          axisLine: { lineStyle: { color: line } }
        },
        yAxis: {
          type: "value",
          axisLabel: { color: ink, formatter: value => `${(value * 100).toFixed(0)}%` },
          splitLine: { lineStyle: { color: line } }
        },
        series: [
          { name: "实际", type: "bar", data: actual, itemStyle: { color: cinnabar } },
          { name: "理论", type: "line", data: expected, itemStyle: { color: gold }, lineStyle: { color: gold } }
        ]
      });
    } else {
      chartEl.textContent = "图表依赖未加载（ECharts），已跳过图表渲染。";
    }

    deviationEl.textContent = `偏离度 (L1): ${deviation.toFixed(3)}`;
    if (deviation > 0.25) riskEl.textContent = "提示: 偏离较高，建议重点复核。";
    else if (deviation > 0.15) riskEl.textContent = "提示: 中等偏离，建议抽样复核。";
    else riskEl.textContent = "提示: 偏离较低，但仍需结合业务背景判断。";

    detailsEl.innerHTML = "";
    actual.forEach((a, i) => {
      const li = document.createElement("li");
      li.textContent = `数字 ${i + 1}: 实际 ${(a * 100).toFixed(2)}%, 理论 ${(expected[i] * 100).toFixed(2)}%`;
      detailsEl.appendChild(li);
    });
    setStatus(`分析完成，共使用 ${total} 个数值`);
  } catch (err) {
    setStatus(`分析失败: ${err.message}`);
  }
});

if (!window.echarts && chartEl) {
  chartEl.textContent = "图表依赖未加载（ECharts），请检查网络或稍后重试。";
}

// === Demo Data: Built-in Benford test ===
const demoBtn = document.getElementById("demoBtn");
if (demoBtn) {
  demoBtn.addEventListener("click", () => {
    // 内置示范：中国主要城市人口数（万人）——自然数据应服从 Benford
    const demoCsvContent = [
      "city,population",
      "上海,2489", "北京,2189", "重庆,3213", "成都,2119", "广州,1881",
      "深圳,1768", "天津,1387", "武汉,1245", "杭州,1237", "苏州,1275",
      "郑州,1274", "西安,1300", "南京,943", "长沙,1024", "青岛,1027",
      "沈阳,911", "大连,745", "哈尔滨,1001", "济南,920", "昆明,846",
      "长春,907", "合肥,947", "南昌,627", "太原,539", "石家庄,1122",
      "贵阳,599", "南宁,883", "兰州,437", "呼和浩特,344", "银川,289",
      "西宁,247", "拉萨,87", "乌鲁木齐,356", "福州,843", "厦门,528",
      "无锡,746", "常州,536", "金华,705", "温州,958", "宁波,954",
      "佛山,949", "东莞,1047", "珠海,247", "惠州,604", "中山,441",
      "泉州,887", "徐州,902", "烟台,710", "潍坊,938", "淄博,470"
    ].join("\n");

    // Create a virtual file object from the demo data
    const blob = new Blob([demoCsvContent], { type: "text/csv" });
    const file = new File([blob], "china_city_population.csv", { type: "text/csv" });

    // Inject into file input
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;

    setStatus('已加载示范数据（中国城市人口），点击"开始分析"查看结果');
  });
}

// === PM Metrics Integration ===
(function () {
  try {
    if (!window.pmMetrics) return;
    // Auto mark task start on first meaningful interaction
    let taskStarted = false;
    document.addEventListener('click', function (e) {
      if (taskStarted) return;
      const btn = e.target.closest('button');
      if (btn) {
        taskStarted = true;
        window.pmMetrics.markTaskStart('benford_check_task');
      }
    }, { once: false });
  } catch (_e) { }
})();
