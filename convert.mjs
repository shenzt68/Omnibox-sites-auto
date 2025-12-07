// convert.mjs
import fs from "node:fs/promises";

// 两个源文件（完整版 + 精简版）
const SOURCE_FULL =
  "https://raw.githubusercontent.com/hafrey1/LunaTV-config/refs/heads/main/LunaTV-config.json";
const SOURCE_LITE =
  "https://raw.githubusercontent.com/hafrey1/LunaTV-config/refs/heads/main/jingjian.json";

/** 判断名称是否英文开头，用于“英文在前、中文在后”排序 */
function isEnglish(str) {
  return /^[A-Za-z]/.test((str || "").trim());
}

/**
 * 将不同格式的源 JSON 统一转换为 {sites: [...] }
 * 自动适配：api_site / sites / 数组 / 对象
 */
function normalizeToSites(raw) {
  let list;

  if (Array.isArray(raw)) {
    list = raw;
  } else if (Array.isArray(raw?.sites)) {
    list = raw.sites;
  } else if (raw?.api_site && typeof raw.api_site === "object") {
    list = Object.values(raw.api_site);
  } else if (typeof raw === "object") {
    list = Object.values(raw);
  } else {
    list = [];
  }

  const sites = list
    .map((item) => {
      const name = item.name || item.key || "";
      const api =
        item.api ||
        item.url || // 某些 LunaTV 配置使用 url 当 api
        "";

      return {
        id: "",
        key: name,
        name,
        api,
        type: 2,
        isActive: 1,
        time: "",
        isDefault: 0,
        remark: "",
        tags: [],
        priority: 0,
        proxyMode: "none",
        customProxy: "",
      };
    })
    // 过滤掉没有 api 的项
    .filter((s) => s.api);

  // 排序：英文名称优先，然后中文名称
  sites.sort((a, b) => {
    const na = a.name || "";
    const nb = b.name || "";

    const aEng = isEnglish(na);
    const bEng = isEnglish(nb);

    if (aEng && !bEng) return -1;
    if (!aEng && bEng) return 1;

    if (aEng && bEng) {
      return na.localeCompare(nb, "en", { sensitivity: "base" });
    }

    return na.localeCompare(nb, "zh-Hans-CN", { sensitivity: "base" });
  });

  return { sites };
}

/** 将某个源 URL 转换为目标文件 */
async function convertOne(sourceUrl, outputFile) {
  console.log(`Fetching: ${sourceUrl}`);

  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Failed: ${res.status} ${res.statusText}`);

  const raw = await res.json();
  const output = normalizeToSites(raw);

  await fs.writeFile(outputFile, JSON.stringify(output, null, 2), "utf8");

  console.log(
    `Generated ${outputFile} with ${output.sites.length} site(s)`
  );
}

async function main() {
  await convertOne(SOURCE_FULL, "sitesFull.json");
  await convertOne(SOURCE_LITE, "sitesLite.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
