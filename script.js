document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const menuButton = document.querySelector(".menu-toggle");
  const mobileMenu = document.getElementById("mobileMenu");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Light / dark theme ---------- */
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");
  const savedTheme = () => { try { return localStorage.getItem("ukmc-theme"); } catch (e) { return null; } };

  const applyTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    const dark = theme === "dark";
    themeToggle?.setAttribute("aria-pressed", String(dark));
    themeToggle?.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#08131c" : "#0B1B28");
  };

  applyTheme(savedTheme() === "dark" ? "dark" : "light");

  themeToggle?.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("ukmc-theme", next); } catch (e) { /* storage unavailable */ }
  });

  /* ---------- Mobile menu ---------- */
  const setMenu = (open) => {
    mobileMenu?.classList.toggle("open", open);
    menuButton?.setAttribute("aria-expanded", String(open));
    menuButton?.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  menuButton?.addEventListener("click", () => {
    setMenu(menuButton.getAttribute("aria-expanded") !== "true");
  });

  mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobileMenu?.classList.contains("open")) {
      setMenu(false);
      menuButton?.focus();
    }
  });

  window.matchMedia("(min-width: 901px)").addEventListener("change", (e) => {
    if (e.matches) setMenu(false);
  });

  /* ---------- Header shadow + mobile sticky CTA ---------- */
  const hero = document.querySelector(".hero");
  const applySection = document.getElementById("apply");
  const mobileCta = document.querySelector(".mobile-cta");
  const backToTop = document.getElementById("backToTop");
  let applyInView = false;

  const onScroll = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 8);
    backToTop?.classList.toggle("is-visible", window.scrollY > window.innerHeight);
    if (mobileCta && hero) {
      const pastHero = hero.getBoundingClientRect().bottom < 0;
      mobileCta.classList.toggle("is-visible", pastHero && !applyInView);
    }
  };

  if (applySection && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      applyInView = entry.isIntersecting;
      onScroll();
    }, { threshold: 0.05 }).observe(applySection);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Active nav link (scroll spy) ---------- */
  const navLinks = [...document.querySelectorAll(".desktop-nav a")];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          const active = link.getAttribute("href") === `#${entry.target.id}`;
          link.classList.toggle("is-active", active);
          if (active) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((section) => spy.observe(section));
  }

  /* ---------- Hero funding estimator ---------- */
  const CASHFLOW_MIN = 5000;
  const CASHFLOW_MAX = 1000000;
  const FUNDING_MULTIPLE = 1.5;
  const FUNDING_CAP = 1000000;

  const cashflowRange = document.getElementById("cashflowRange");
  const plot = document.querySelector(".calc-plot");
  const cashflowOut = document.getElementById("cashflowOutput");
  const fundingOut = document.getElementById("fundingOutput");
  const fundingBadge = document.getElementById("fundingBadge");
  const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

  // Slider position t (0–1) maps to cash flow on a squared scale for finer control at lower amounts.
  const cashflowAt = (t) => CASHFLOW_MIN + t * t * (CASHFLOW_MAX - CASHFLOW_MIN);
  const fundingFor = (cashflow) => Math.min(cashflow * FUNDING_MULTIPLE, FUNDING_CAP);
  const roundCashflow = (value) => {
    const step = value < 50000 ? 1000 : value < 250000 ? 5000 : 10000;
    return Math.round(value / step) * step;
  };

  const drawCurve = () => {
    const points = [];
    for (let i = 0; i <= 100; i += 1) {
      const t = i / 100;
      const y = 100 - (fundingFor(cashflowAt(t)) / FUNDING_CAP) * 100;
      points.push(`${(t * 100).toFixed(2)},${y.toFixed(2)}`);
    }
    const line = `M${points.join(" L")}`;
    document.getElementById("calcLine")?.setAttribute("d", line);
    document.getElementById("calcArea")?.setAttribute("d", `${line} L100,100 L0,100 Z`);
  };

  const updateEstimator = () => {
    if (!cashflowRange || !plot) return;
    const t = Number(cashflowRange.value) / Number(cashflowRange.max);
    const cashflow = roundCashflow(cashflowAt(t));
    const funding = fundingFor(cashflow);
    const capped = cashflow * FUNDING_MULTIPLE >= FUNDING_CAP;

    cashflowOut.textContent = money.format(cashflow);
    fundingOut.textContent = money.format(funding);
    fundingBadge.textContent = capped ? "MAX £1M" : `${FUNDING_MULTIPLE}×`;
    fundingBadge.classList.toggle("is-max", capped);

    plot.style.setProperty("--px", `${t * 100}%`);
    plot.style.setProperty("--py", `${100 - (funding / FUNDING_CAP) * 100}%`);
    cashflowRange.style.setProperty("--fill", `${t * 100}%`);
    cashflowRange.setAttribute("aria-valuetext", `Monthly cash flow ${money.format(cashflow)}, estimated funding ${money.format(funding)}`);
  };

  const calcHint = document.getElementById("calcHint");
  const dismissHint = () => {
    calcHint?.classList.add("is-hidden");
    cashflowRange?.classList.remove("is-untouched");
  };

  drawCurve();
  cashflowRange?.addEventListener("input", updateEstimator);
  ["input", "pointerdown", "keydown"].forEach((type) => cashflowRange?.addEventListener(type, dismissHint, { once: true }));

  /* ---------- Carry the estimate through to the form ---------- */
  const heroCtaLabel = document.getElementById("heroCtaLabel");
  const amountSelect = document.getElementById("f-amount");
  const estimateNote = document.getElementById("estimateNote");
  const estimateNoteValue = document.getElementById("estimateNoteValue");
  const estimateField = document.getElementById("f-estimate");
  const AMOUNT_BAND_LIMITS = [10000, 50000, 100000, 250000, Infinity];
  let amountChosenManually = false;

  amountSelect?.addEventListener("change", () => { amountChosenManually = true; });

  const carryEstimate = () => {
    const t = Number(cashflowRange.value) / Number(cashflowRange.max);
    const funding = fundingFor(roundCashflow(cashflowAt(t)));
    const label = money.format(funding);
    if (heroCtaLabel) heroCtaLabel.textContent = `Request ${label}`;
    if (estimateNote && estimateNoteValue) {
      estimateNoteValue.textContent = label;
      estimateNote.hidden = false;
    }
    if (estimateField) estimateField.value = label;
    if (amountSelect && !amountChosenManually) {
      amountSelect.selectedIndex = AMOUNT_BAND_LIMITS.findIndex((limit) => funding <= limit) + 1;
    }
  };

  cashflowRange?.addEventListener("input", carryEstimate);
  updateEstimator();

  /* ---------- Repayment flex illustration ---------- */
  const range = document.getElementById("salesRange");
  const salesOut = document.getElementById("salesOutput");
  const repayOut = document.getElementById("repayOutput");
  const keepOut = document.getElementById("keepOutput");
  const repayBar = document.getElementById("repayBar");
  const EXAMPLE_RATE = 0.1;
  const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

  const updateDemo = () => {
    if (!range) return;
    const sales = Number(range.value);
    const repay = Math.round(sales * EXAMPLE_RATE);
    const min = Number(range.min);
    const max = Number(range.max);
    const pct = ((sales - min) / (max - min)) * 100;

    salesOut.textContent = gbp.format(sales);
    repayOut.textContent = gbp.format(repay);
    keepOut.textContent = gbp.format(sales - repay);
    range.style.setProperty("--fill", `${pct}%`);
    repayBar.style.width = `${Math.max(4, (repay / (max * EXAMPLE_RATE)) * 100)}%`;
  };

  range?.addEventListener("input", updateDemo);
  updateDemo();

  /* ---------- Application form ---------- */
  const form = document.getElementById("applicationForm");
  const status = form?.querySelector(".form-status");
  const submitButton = form?.querySelector('button[type="submit"]');

  const messages = {
    name: "Please enter your name.",
    business: "Please enter your business name.",
    email: "Please enter a valid email address.",
    phone: "Please enter a valid UK phone number.",
    amount: "Please choose a funding range."
  };

  const validateField = (field) => {
    const wrapper = field.closest(".field");
    const error = wrapper?.querySelector(".field-error");
    if (field.name === "phone") field.value = field.value.replace(/[^\d+\s]/g, "");
    const valid = field.checkValidity();
    wrapper?.classList.toggle("has-error", !valid);
    field.setAttribute("aria-invalid", String(!valid));
    if (error) error.textContent = valid ? "" : (messages[field.name] || field.validationMessage);
    return valid;
  };

  form?.querySelectorAll("[required]").forEach((field) => {
    field.addEventListener("blur", () => validateField(field));
    field.addEventListener("input", () => {
      if (field.closest(".field")?.classList.contains("has-error")) validateField(field);
    });
  });

  const showStatus = (text, isError = false) => {
    status.textContent = text;
    status.classList.toggle("is-error", isError);
    status.hidden = false;
    status.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fields = [...form.querySelectorAll("[required]")];
    const invalid = fields.filter((field) => !validateField(field));
    if (invalid.length) {
      invalid[0].focus();
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    if (data.website) return; // honeypot filled – likely a bot
    delete data.website;

    const endpoint = form.dataset.endpoint;
    submitButton.disabled = true;
    submitButton.firstChild.textContent = "Sending… ";

    try {
      if (endpoint) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ ...data, source: window.location.href, submittedAt: new Date().toISOString() })
        });
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      }

      form.querySelectorAll("input, textarea, select, button").forEach((el) => { el.disabled = true; });
      submitButton.firstChild.textContent = "Request sent ";
      showStatus(`Thanks ${data.name.split(" ")[0]} — we’ve received your enquiry and a member of the team will be in touch shortly.`);
    } catch (error) {
      console.error(error);
      submitButton.disabled = false;
      submitButton.firstChild.textContent = "Request a call ";
      showStatus("Sorry, something went wrong sending your enquiry. Please try again in a moment.", true);
    }
  });

  /* ---------- Footer year ---------- */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Reveal on scroll ---------- */
  const revealItems = document.querySelectorAll(".benefit-card, .step, .stat, .flex-demo");
  if (!reduceMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealItems.forEach((item, i) => {
      item.classList.add("reveal");
      item.style.transitionDelay = `${(i % 3) * 80}ms`;
      observer.observe(item);
    });
  }
});
