document.addEventListener("DOMContentLoaded", () => {
  /* ── DOM refs ─────────────────────────────── */
  const cidrInput = document.getElementById("cidr-input");
  const prefixSlider = document.getElementById("cidr-prefix-slider");
  const prefixValue = document.getElementById("cidr-prefix-value");
  const ipv6Toggle = document.getElementById("cidr-ipv6-toggle");
  const calcBtn = document.getElementById("cidr-calc-btn");
  const emptyState = document.getElementById("cidr-empty-state");
  const resultsDiv = document.getElementById("cidr-results");
  const resultGrid = document.getElementById("cidr-result-grid");
  const outputArea = document.getElementById("cidr-output-area");
  const tableCard = document.getElementById("cidr-table-card");
  const refTbody = document.getElementById("cidr-ref-tbody");
  const toast = document.getElementById("cidr-toast");

  /* ── Language helper ──────────────────────── */
  function getLang() {
    return localStorage.getItem("lang") || "ru";
  }

  /* ── IPv4 helpers ─────────────────────────── */
  function ipv4ToInt(ip) {
    const parts = ip.split(".");
    if (parts.length !== 4) return null;
    let num = 0;
    for (let i = 0; i < 4; i++) {
      const octet = parseInt(parts[i], 10);
      if (isNaN(octet) || octet < 0 || octet > 255) return null;
      num = (num * 256) + octet;
    }
    return num >>> 0;
  }

  function intToIpv4(num) {
    return [
      (num >>> 24) & 255,
      (num >>> 16) & 255,
      (num >>> 8) & 255,
      num & 255,
    ].join(".");
  }

  function ipv4Mask(prefix) {
    if (prefix === 0) return 0;
    return ((0xffffffff << (32 - prefix)) >>> 0);
  }

  function ipv4WildCard(prefix) {
    return (~ipv4Mask(prefix)) >>> 0;
  }

  /* ── IPv6 helpers ─────────────────────────── */
  function expandIPv6(ip) {
    ip = ip.trim();
    if (ip.includes("::")) {
      const halves = ip.split("::");
      const left = halves[0] ? halves[0].split(":") : [];
      const right = halves[1] ? halves[1].split(":") : [];
      const fill = 8 - left.length - right.length;
      const mid = Array(fill).fill("0000");
      const groups = [...left, ...mid, ...right];
      return groups.map((g) => g.padStart(4, "0")).join(":");
    }
    const groups = ip.split(":");
    if (groups.length !== 8) return null;
    return groups.map((g) => g.padStart(4, "0")).join(":");
  }

  function ipv6ToBigInt(ip) {
    const expanded = expandIPv6(ip);
    if (!expanded) return null;
    const hex = expanded.replace(/:/g, "");
    if (hex.length !== 32 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
    return BigInt("0x" + hex);
  }

  function bigIntToIPv6(n) {
    const hex = n.toString(16).padStart(32, "0");
    const groups = [];
    for (let i = 0; i < 32; i += 4) {
      groups.push(hex.slice(i, i + 4));
    }
    return groups.join(":");
  }

  function compressIPv6(full) {
    let groups = full.split(":");
    groups = groups.map((g) => g.replace(/^0+/, "") || "0");
    let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
    for (let i = 0; i < groups.length; i++) {
      if (groups[i] === "0") {
        if (curStart === -1) curStart = i;
        curLen++;
        if (curLen > bestLen) {
          bestStart = curStart;
          bestLen = curLen;
        }
      } else {
        curStart = -1;
        curLen = 0;
      }
    }
    if (bestLen > 1) {
      groups.splice(bestStart, bestLen, "");
      let result = groups.join(":");
      if (result.startsWith(":") && !result.startsWith("::")) result = ":" + result;
      if (result.endsWith(":") && !result.endsWith("::")) result += ":";
      return result;
    }
    return groups.join(":");
  }

  function ipv6Mask(prefix) {
    if (prefix === 0) return 0n;
    const shift = BigInt(128 - prefix);
    return ((1n << 128n) - 1n) ^ ((1n << shift) - 1n);
  }

  /* ── Parse input ──────────────────────────── */
  function parseInput() {
    const raw = cidrInput.value.trim();
    const isIPv6 = ipv6Toggle.checked;

    let ip, prefix;

    if (raw.includes("/")) {
      const parts = raw.split("/");
      ip = parts[0];
      prefix = parseInt(parts[1], 10);
      if (isNaN(prefix)) prefix = null;
    } else {
      ip = raw || (isIPv6 ? "::" : "0.0.0.0");
      prefix = parseInt(prefixSlider.value, 10);
    }

    return { ip, prefix, isIPv6 };
  }

  /* ── Calculate IPv4 ───────────────────────── */
  function calcIPv4(ip, prefix) {
    if (prefix < 0 || prefix > 32) return null;
    const ipInt = ipv4ToInt(ip);
    if (ipInt === null) return null;

    const mask = ipv4Mask(prefix);
    const wildcard = ipv4WildCard(prefix);
    const network = (ipInt & mask) >>> 0;
    const broadcast = (network | wildcard) >>> 0;
    const totalAddresses = Math.pow(2, 32 - prefix);
    const usableHosts = prefix <= 30 ? totalAddresses - 2 : (prefix === 31 ? 2 : 1);
    const firstHost = prefix <= 30 ? (network + 1) >>> 0 : network;
    const lastHost = prefix <= 30 ? (broadcast - 1) >>> 0 : broadcast;

    const lang = getLang();

    return {
      items: [
        {
          label: lang === "ru" ? "Сеть" : "Network",
          value: intToIpv4(network) + "/" + prefix,
        },
        {
          label: lang === "ru" ? "Маска" : "Netmask",
          value: intToIpv4(mask),
        },
        {
          label: "Wildcard",
          value: intToIpv4(wildcard),
        },
        {
          label: "Broadcast",
          value: intToIpv4(broadcast),
        },
        {
          label: lang === "ru" ? "Первый хост" : "First host",
          value: intToIpv4(firstHost),
        },
        {
          label: lang === "ru" ? "Последний хост" : "Last host",
          value: intToIpv4(lastHost),
        },
        {
          label: lang === "ru" ? "Всего адресов" : "Total addresses",
          value: totalAddresses.toLocaleString(),
          full: true,
        },
        {
          label: lang === "ru" ? "Доступных хостов" : "Usable hosts",
          value: usableHosts.toLocaleString(),
          full: true,
        },
      ],
      prefix,
    };
  }

  /* ── Calculate IPv6 ───────────────────────── */
  function calcIPv6(ip, prefix) {
    if (prefix < 0 || prefix > 128) return null;
    const ipBig = ipv6ToBigInt(ip);
    if (ipBig === null) return null;

    const mask = ipv6Mask(prefix);
    const network = ipBig & mask;
    const hostBits = 128 - prefix;
    const totalAddresses = 1n << BigInt(hostBits);
    const lastAddr = network + totalAddresses - 1n;

    const lang = getLang();

    const networkStr = compressIPv6(bigIntToIPv6(network));
    const lastStr = compressIPv6(bigIntToIPv6(lastAddr));

    let totalStr;
    if (hostBits <= 64) {
      totalStr = totalAddresses.toLocaleString();
    } else {
      totalStr = "2^" + hostBits;
    }

    return {
      items: [
        {
          label: lang === "ru" ? "Сеть" : "Network",
          value: networkStr + "/" + prefix,
          full: true,
        },
        {
          label: lang === "ru" ? "Полная запись" : "Full address",
          value: bigIntToIPv6(network),
          full: true,
        },
        {
          label: lang === "ru" ? "Первый адрес" : "First address",
          value: networkStr,
          full: true,
        },
        {
          label: lang === "ru" ? "Последний адрес" : "Last address",
          value: lastStr,
          full: true,
        },
        {
          label: lang === "ru" ? "Всего адресов" : "Total addresses",
          value: totalStr,
          full: true,
        },
        {
          label: lang === "ru" ? "Префикс" : "Prefix length",
          value: "/" + prefix,
        },
        {
          label: lang === "ru" ? "Хост-бит" : "Host bits",
          value: String(hostBits),
        },
      ],
      prefix,
    };
  }

  /* ── Render results ───────────────────────── */
  function renderResults(result) {
    resultGrid.innerHTML = "";

    result.items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "cidr-result-item" + (item.full ? " full-width" : "");
      div.innerHTML =
        '<span class="cidr-result-label">' +
        escapeHTML(item.label) +
        '</span><span class="cidr-result-value">' +
        escapeHTML(item.value) +
        "</span>";
      div.addEventListener("click", () => copyText(item.value));
      resultGrid.appendChild(div);
    });

    emptyState.classList.add("hidden");
    resultsDiv.classList.add("visible");
    outputArea.classList.add("has-results");
  }

  /* ── Reference table ───────────────────────── */
  function buildRefTable(isIPv6, activePrefix) {
    refTbody.innerHTML = "";

    if (isIPv6) {
      const prefixes = [128, 127, 126, 124, 120, 112, 96, 64, 56, 48, 32, 16, 8, 0];
      prefixes.forEach((p) => {
        const hostBits = 128 - p;
        const total = hostBits <= 64 ? (1n << BigInt(hostBits)).toLocaleString() : "2^" + hostBits;
        const tr = document.createElement("tr");
        if (p === activePrefix) tr.className = "active";
        tr.innerHTML =
          "<td>/" + p + "</td>" +
          "<td>" + (p === 128 ? "Single host" : "—") + "</td>" +
          "<td>" + total + "</td>" +
          "<td>" + total + "</td>";
        refTbody.appendChild(tr);
      });
    } else {
      for (let p = 32; p >= 0; p--) {
        const mask = ipv4Mask(p);
        const total = Math.pow(2, 32 - p);
        const usable = p <= 30 ? total - 2 : (p === 31 ? 2 : 1);
        const tr = document.createElement("tr");
        if (p === activePrefix) tr.className = "active";
        tr.innerHTML =
          "<td>/" + p + "</td>" +
          "<td>" + intToIpv4(mask) + "</td>" +
          "<td>" + total.toLocaleString() + "</td>" +
          "<td>" + usable.toLocaleString() + "</td>";
        refTbody.appendChild(tr);
      }
    }

    tableCard.classList.add("visible");
  }

  /* ── Main calculation ─────────────────────── */
  function calculate() {
    cidrInput.classList.remove("error");

    const { ip, prefix, isIPv6 } = parseInput();
    const maxPrefix = isIPv6 ? 128 : 32;

    const effectivePrefix = Math.min(Math.max(prefix ?? parseInt(prefixSlider.value, 10), 0), maxPrefix);

    let result;
    if (isIPv6) {
      result = calcIPv6(ip, effectivePrefix);
    } else {
      result = calcIPv4(ip, effectivePrefix);
    }

    if (!result) {
      cidrInput.classList.add("error");
      calcBtn.classList.add("shake");
      calcBtn.addEventListener("animationend", () => calcBtn.classList.remove("shake"), { once: true });
      showToast(getLang() === "ru" ? "Неверный формат IP-адреса" : "Invalid IP address format");
      return;
    }

    renderResults(result);
    buildRefTable(isIPv6, effectivePrefix);

    /* Sync slider */
    prefixSlider.value = effectivePrefix;
    prefixValue.textContent = "/" + effectivePrefix;
    updateSliderFill();
  }

  /* ── Slider ───────────────────────────────── */
  function updateSliderFill() {
    const min = Number(prefixSlider.min);
    const max = Number(prefixSlider.max);
    const val = Number(prefixSlider.value);
    const pct = ((val - min) / (max - min)) * 100;
    prefixSlider.style.setProperty("--slider-pct", pct.toFixed(1) + "%");
  }

  prefixSlider.addEventListener("input", () => {
    prefixValue.textContent = "/" + prefixSlider.value;
    updateSliderFill();

    prefixValue.classList.remove("bump");
    void prefixValue.offsetWidth;
    prefixValue.classList.add("bump");
  });

  updateSliderFill();

  /* ── IPv6 toggle ──────────────────────────── */
  ipv6Toggle.addEventListener("change", () => {
    const isIPv6 = ipv6Toggle.checked;
    const maxPrefix = isIPv6 ? 128 : 32;

    prefixSlider.max = maxPrefix;
    if (parseInt(prefixSlider.value, 10) > maxPrefix) {
      prefixSlider.value = maxPrefix;
    }
    prefixValue.textContent = "/" + prefixSlider.value;
    updateSliderFill();

    /* Update ticks */
    const ticksContainer = document.querySelector(".cidr-slider-ticks");
    if (isIPv6) {
      ticksContainer.innerHTML =
        "<span>/0</span><span>/32</span><span>/64</span><span>/96</span><span>/128</span>";
      cidrInput.placeholder = "2001:db8::/32";
    } else {
      ticksContainer.innerHTML =
        "<span>/0</span><span>/8</span><span>/16</span><span>/24</span><span>/32</span>";
      cidrInput.placeholder = "192.168.1.0/24";
    }
  });

  /* ── Parse CIDR from input on typing ──────── */
  cidrInput.addEventListener("input", () => {
    cidrInput.classList.remove("error");
    const raw = cidrInput.value.trim();
    if (raw.includes("/")) {
      const parts = raw.split("/");
      const p = parseInt(parts[1], 10);
      const max = ipv6Toggle.checked ? 128 : 32;
      if (!isNaN(p) && p >= 0 && p <= max) {
        prefixSlider.value = p;
        prefixValue.textContent = "/" + p;
        updateSliderFill();
      }
    }

    /* Auto-detect IPv6 */
    if (raw.includes(":") && !ipv6Toggle.checked) {
      ipv6Toggle.checked = true;
      ipv6Toggle.dispatchEvent(new Event("change"));
    } else if (!raw.includes(":") && raw.includes(".") && ipv6Toggle.checked) {
      ipv6Toggle.checked = false;
      ipv6Toggle.dispatchEvent(new Event("change"));
    }
  });

  /* ── Toast ────────────────────────────────── */
  let toastTimer = null;

  function showToast(message) {
    const ruSpan = document.getElementById("cidr-toast-text-ru");
    const enSpan = document.getElementById("cidr-toast-text-en");
    if (ruSpan) ruSpan.textContent = message;
    if (enSpan) enSpan.textContent = message;

    toast.classList.add("visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
  }

  /* ── Copy ──────────────────────────────────── */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(getLang() === "ru" ? "Скопировано!" : "Copied!");
    } catch {
      showToast(getLang() === "ru" ? "Не удалось скопировать" : "Failed to copy");
    }
  }

  /* ── Escape HTML ──────────────────────────── */
  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ── IP-in-range checker ─────────────────── */
  const checkIpInput = document.getElementById("cidr-check-ip");
  const checkRangeInput = document.getElementById("cidr-check-range");
  const checkBtn = document.getElementById("cidr-check-btn");
  const checkResult = document.getElementById("cidr-check-result");

  function detectIPVersion(str) {
    if (str.includes(":")) return 6;
    if (str.includes(".")) return 4;
    return 0;
  }

  function checkIPInRange() {
    const ipRaw = checkIpInput.value.trim();
    const rangeRaw = checkRangeInput.value.trim();
    const lang = getLang();

    checkIpInput.classList.remove("error");
    checkRangeInput.classList.remove("error");

    if (!ipRaw || !rangeRaw) {
      if (!ipRaw) checkIpInput.classList.add("error");
      if (!rangeRaw) checkRangeInput.classList.add("error");
      showToast(lang === "ru" ? "Заполните оба поля" : "Fill in both fields");
      return;
    }

    if (!rangeRaw.includes("/")) {
      checkRangeInput.classList.add("error");
      showToast(lang === "ru" ? "Укажите подсеть в CIDR-нотации (напр. /24)" : "Use CIDR notation (e.g. /24)");
      return;
    }

    const rangeParts = rangeRaw.split("/");
    const rangeIp = rangeParts[0];
    const rangePrefix = parseInt(rangeParts[1], 10);

    const ipVer = detectIPVersion(ipRaw);
    const rangeVer = detectIPVersion(rangeIp);

    if (ipVer !== rangeVer || ipVer === 0) {
      checkIpInput.classList.add("error");
      checkRangeInput.classList.add("error");
      showToast(lang === "ru" ? "Версии IP не совпадают или формат неверен" : "IP versions mismatch or invalid format");
      return;
    }

    let isInRange = false;

    if (ipVer === 4) {
      const ipInt = ipv4ToInt(ipRaw);
      const rangeInt = ipv4ToInt(rangeIp);

      if (ipInt === null) { checkIpInput.classList.add("error"); showToast(lang === "ru" ? "Неверный IP-адрес" : "Invalid IP address"); return; }
      if (rangeInt === null || isNaN(rangePrefix) || rangePrefix < 0 || rangePrefix > 32) { checkRangeInput.classList.add("error"); showToast(lang === "ru" ? "Неверная подсеть" : "Invalid subnet"); return; }

      const mask = ipv4Mask(rangePrefix);
      isInRange = ((ipInt & mask) >>> 0) === ((rangeInt & mask) >>> 0);
    } else {
      const ipBig = ipv6ToBigInt(ipRaw);
      const rangeBig = ipv6ToBigInt(rangeIp);

      if (ipBig === null) { checkIpInput.classList.add("error"); showToast(lang === "ru" ? "Неверный IPv6-адрес" : "Invalid IPv6 address"); return; }
      if (rangeBig === null || isNaN(rangePrefix) || rangePrefix < 0 || rangePrefix > 128) { checkRangeInput.classList.add("error"); showToast(lang === "ru" ? "Неверная подсеть" : "Invalid subnet"); return; }

      const mask = ipv6Mask(rangePrefix);
      isInRange = (ipBig & mask) === (rangeBig & mask);
    }

    checkResult.className = "cidr-check-result visible " + (isInRange ? "match" : "no-match");
    if (isInRange) {
      checkResult.innerHTML =
        '<i class="fas fa-check-circle"></i>' +
        '<span class="text-ru">' + escapeHTML(ipRaw) + ' <b>входит</b> в ' + escapeHTML(rangeRaw) + '</span>' +
        '<span class="text-en">' + escapeHTML(ipRaw) + ' <b>is within</b> ' + escapeHTML(rangeRaw) + '</span>';
    } else {
      checkResult.innerHTML =
        '<i class="fas fa-times-circle"></i>' +
        '<span class="text-ru">' + escapeHTML(ipRaw) + ' <b>не входит</b> в ' + escapeHTML(rangeRaw) + '</span>' +
        '<span class="text-en">' + escapeHTML(ipRaw) + ' <b>is not within</b> ' + escapeHTML(rangeRaw) + '</span>';
    }
  }

  checkBtn.addEventListener("click", checkIPInRange);

  checkIpInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); checkIPInRange(); }
  });

  checkRangeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); checkIPInRange(); }
  });

  checkIpInput.addEventListener("input", () => checkIpInput.classList.remove("error"));
  checkRangeInput.addEventListener("input", () => checkRangeInput.classList.remove("error"));

  /* ── Event listeners ──────────────────────── */
  calcBtn.addEventListener("click", calculate);

  cidrInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      calculate();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      calculate();
    }
  });
});
