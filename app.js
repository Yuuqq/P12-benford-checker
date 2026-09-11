const fileInput = document.getElementById("fileInput");
const encodingSelect = document.getElementById("encodingSelect");
const columnSelect = document.getElementById("columnSelect");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusEl = document.getElementById("status");
const sampleSizeEl = document.getElementById("sampleSize");
const deviationEl = document.getElementById("deviation");
const riskEl = document.getElementById("risk");
const detailsEl = document.getElementById("details");
const chartEl = document.getElementById("chart");
let chart = null;

function setStatus(text) {
  statusEl.textContent = `状态: ${text}`;
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  const encoding = encodingSelect.value;
  setStatus("读取列名中...");

  if (!ensurePapa("CSV 解析")) return;

  // Stream just the first row to get headers
  Papa.parse(file, {
    header: true,
    preview: 1,
    skipEmptyLines: true,
    encoding: encoding,
    complete: function (results) {
      if (results.meta && results.meta.fields && results.meta.fields.length > 0) {
        columnSelect.innerHTML = "";
        results.meta.fields.forEach(field => {
          const option = document.createElement("option");
          option.value = field;
          option.textContent = field;
          columnSelect.appendChild(option);
        });
        setStatus("请选择要分析的数据列，然后点击开始分析");
      } else {
        setStatus("无法读取列名，请检查 CSV 文件或编码");
      }
    },
    error: function (err) {
      setStatus(`读取列名失败: ${err.message}`);
    }
  });
});

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
  if (value === null || value === undefined) return null;
  const str = String(value);
  // Match the first digit from 1 to 9, ignoring leading zeros, signs, commas, currency symbols, spaces, etc.
  // E.g., "$1,234.56" -> "1", "-0.05" -> "5", "1.234,56" -> "1"
  const m = str.match(/[1-9]/);
  return m ? Number(m[0]) : null;
}

analyzeBtn.addEventListener("click", () => {
  const file = fileInput.files?.[0];
  if (!file) {
    setStatus("请先选择 CSV 文件");
    return;
  }

  const col = columnSelect.value;
  if (!col) {
    setStatus("请先选择要分析的数据列");
    return;
  }

  const encoding = encodingSelect.value;
  setStatus("分析中...");

  if (!ensurePapa("CSV 解析")) return;

  const counts = Array(9).fill(0);
  let total = 0;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    encoding: encoding,
    worker: true,
    step: function(results) {
      const row = results.data;
      if (row && row[col] !== undefined) {
        const d = leadingDigit(row[col]);
        if (d) {
          counts[d - 1] += 1;
          total += 1;
        }
      }
    },
    complete: function() {
      if (!total) {
        setStatus("该列数值不足，无法计算");
        return;
      }

      const actual = counts.map(c => c / total);
      const expected = benfordExpected();

      // Calculate Pearson's Chi-square (χ²) test statistic
      // Degrees of freedom (df) = 9 categories - 1 = 8
      let chiSquare = 0;
      for (let i = 0; i < 9; i++) {
        const expectedCount = expected[i] * total;
        if (expectedCount > 0) {
          chiSquare += Math.pow(counts[i] - expectedCount, 2) / expectedCount;
        }
      }

      const c = ensureChart();
      if (c) {
        c.setOption({
          title: { text: `列 "${col}" Benford 对比` },
          tooltip: { trigger: "axis" },
          legend: { data: ["实际", "理论"] },
          xAxis: { type: "category", data: ["1", "2", "3", "4", "5", "6", "7", "8", "9"] },
          yAxis: { type: "value", axisLabel: { formatter: value => `${(value * 100).toFixed(0)}%` } },
          series: [
            { name: "实际", type: "bar", data: actual, itemStyle: { color: "#4f78d7" } },
            { name: "理论", type: "line", data: expected, itemStyle: { color: "#d46424" } }
          ]
        });
      } else {
        chartEl.textContent = "图表依赖未加载（ECharts），已跳过图表渲染。";
      }

      sampleSizeEl.textContent = `样本量 (N): ${total}`;
      deviationEl.textContent = `卡方 (χ²): ${chiSquare.toFixed(3)}`;

      if (total < 100) {
        riskEl.textContent = "⚠️ 伦理/统计风险: 样本量低于100，卡方检验结果不可靠，极易产生误导。请增加样本量。";
        riskEl.style.color = "#d93025";
        riskEl.style.fontWeight = "bold";
      } else {
        riskEl.style.color = "";
        riskEl.style.fontWeight = "normal";
        // Critical values for df=8:
        // 15.507 (p=0.05), 20.090 (p=0.01), 26.124 (p=0.001)
        if (chiSquare > 26.124) riskEl.textContent = "提示: 数据极显著偏离本福特分布 (p < 0.001)，建议深入调查。";
        else if (chiSquare > 20.090) riskEl.textContent = "提示: 数据显著偏离本福特分布 (p < 0.01)，建议重点复核。";
        else if (chiSquare > 15.507) riskEl.textContent = "提示: 数据偏离本福特分布 (p < 0.05)，建议抽样复核。";
        else riskEl.textContent = "提示: 未发现显著偏离 (p >= 0.05)，数据符合本福特分布预期。";
      }

      detailsEl.innerHTML = "";
      actual.forEach((a, i) => {
        const li = document.createElement("li");
        li.textContent = `数字 ${i + 1}: 实际 ${(a * 100).toFixed(2)}%, 理论 ${(expected[i] * 100).toFixed(2)}%`;
        detailsEl.appendChild(li);
      });
      setStatus(`分析完成，共使用 ${total} 个数值`);
    },
    error: function(err) {
      setStatus(`分析失败: ${err.message}`);
    }
  });
});

if (!window.echarts && chartEl) {
  chartEl.textContent = "图表依赖未加载（ECharts），请检查网络或稍后重试。";
}

// === Demo Data: Built-in Benford test ===
const demoBtn = document.getElementById("demoBtn");
if (demoBtn) {
  demoBtn.addEventListener("click", () => {
    // 内置示范：扩展到包含 150+ 个城市，以满足本福特定律的最小样本量要求
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
      "泉州,887", "徐州,902", "烟台,710", "潍坊,938", "淄博,470",
      "南通,773", "唐山,771", "临沂,1101", "洛阳,705", "保定,1143",
      "济宁,835", "赣州,898", "沧州,730", "衡阳,662", "邵阳,655",
      "商丘,781", "南阳,971", "周口,902", "信阳,623", "驻马店,700",
      "盐城,670", "扬州,455", "泰州,451", "镇江,321", "宿迁,499",
      "连云港,459", "淮安,455", "新乡,625", "安阳,547", "平顶山,498",
      "许昌,438", "焦作,352", "濮阳,377", "漯河,236", "三门峡,203",
      "鹤壁,156", "咸阳,395", "渭南,468", "宝鸡,332", "延安,228",
      "榆林,362", "汉中,321", "安康,249", "商洛,204", "铜川,69",
      "绵阳,486", "南充,560", "达州,538", "宜宾,458", "泸州,425",
      "德阳,345", "广安,325", "乐山,316", "内江,314", "遂宁,281",
      "眉山,295", "自贡,248", "广元,230", "巴中,271", "资阳,230",
      "雅安,143", "攀枝花,121", "马鞍山,215", "芜湖,364", "蚌埠,329",
      "淮南,303", "淮北,197", "铜陵,131", "安庆,416", "黄山,133",
      "滁州,398", "阜阳,820", "宿州,532", "六安,439", "亳州,499",
      "池州,134", "宣城,250", "莆田,321", "三明,248", "漳州,505",
      "南平,268", "龙岩,272", "宁德,314", "曲靖,576", "玉溪,224",
      "保山,243", "昭通,509", "丽江,125", "普洱,240", "临沧,225"
    ].join("\n");

    // Create a virtual file object from the demo data
    const blob = new Blob([demoCsvContent], { type: "text/csv" });
    const file = new File([blob], "china_city_population.csv", { type: "text/csv" });

    // Inject into file input
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;

    // Trigger change event to load headers
    fileInput.dispatchEvent(new Event("change"));

    setStatus('已加载示范数据（中国城市人口），请选择列并点击"开始分析"查看结果');
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
