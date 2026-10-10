/**
 * kds-behavior.js — kds-design 스킬 확장 (KT 공식 키트 파일 아님)
 * 공식 kds-components.css에 동작만 붙인다. 이벤트 위임이라 초기화 호출 없이 동작한다.
 *   <script src="kds/extras/kds-behavior.js" defer></script>
 * React·Vue처럼 상태로 화면을 그리는 앱에서는 불러오지 말고 컴포넌트 상태로 같은 속성을 제어한다.
 *
 * 팝업·시트
 *   <button data-kds-open="confirm">해지</button>
 *   <div class="kds-overlay" id="confirm"><div class="kds-popup" role="dialog" aria-modal="true" aria-labelledby="t">…
 *     <button class="kds-button kds-button--secondary" data-kds-close>취소</button>…</div></div>
 *   Escape·배경 클릭·data-kds-close로 닫힌다. 열린 동안 Tab은 팝업 안에서만 돈다. 닫으면 연 버튼으로 포커스가 돌아간다.
 *   배경 클릭으로 닫히면 안 되는 흐름(결제 진행 중 등): kds-overlay에 data-kds-static
 *   JS: KDS.open('confirm') / KDS.close('confirm')
 *   이벤트: overlay에서 'kds:open', 'kds:close'(detail.reason = escape | backdrop | button | api)
 *
 * 토스트   KDS.toast('저장했어요')  한 번에 1개, 2.5초 뒤 닫힘
 *
 * 탭       <div class="kds-tabs" role="tablist"><button role="tab" aria-selected="true" aria-controls="p1">요금</button>…</div>
 *          <div id="p1" role="tabpanel">…</div>  클릭·←→·Home·End로 선택, aria-controls 패널만 보인다
 *          이벤트: tablist에서 'kds:change'(detail.tab)
 *
 * 단일·복수 선택 (칩·시간 버튼)
 *          <div class="kds-chips" data-kds-select="single">  single | multi
 *          <div class="kds-time-buttons" data-kds-select="single">
 *          자식 button의 aria-pressed를 바꾼다. disabled는 무시. 이벤트: 컨테이너에서 'kds:change'(detail.values)
 *
 * 입력 임시저장 (Seamless Flow 3-4 "작성 중인 내용 유지")
 *          const draft = KDS.draft(form, 'order');      입력할 때마다 저장
 *          if (draft.saved) KDS.open('resume');          "작성 중인 주문서가 있어요" → 이어서 작성 / 새로 작성
 *          draft.restore()  draft.clear()                제출 성공 뒤 clear
 *          password·file·data-kds-no-draft 필드는 저장하지 않는다. KDS.draft(form, key, { session: true })면 탭을 닫을 때 지운다.
 */
(function () {
  "use strict";
  if (window.KDS && window.KDS.__behavior) return;

  var FOCUSABLE = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
  var stack = []; // 열린 overlay 순서 (마지막이 맨 위)
  var downTarget = null;

  function byId(id) { return typeof id === "string" ? document.getElementById(id) : id; }
  function focusables(root) {
    return Array.prototype.filter.call(root.querySelectorAll(FOCUSABLE), function (el) {
      return el.offsetParent !== null || el === document.activeElement;
    });
  }
  function emit(el, name, detail) { el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: detail })); }

  /* ── 팝업·시트 ─────────────────────────── */
  function open(id, opener) {
    var overlay = byId(id);
    if (!overlay || overlay.classList.contains("is-open")) return;
    var dialog = overlay.querySelector('[role="dialog"], .kds-popup, .kds-sheet') || overlay;
    if (!dialog.hasAttribute("role")) dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    overlay.__kdsOpener = opener || document.activeElement;
    overlay.classList.add("is-open");
    if (stack.length === 0) {
      document.documentElement.__kdsOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
    }
    stack.push(overlay);
    var first = dialog.querySelector("[autofocus]") || focusables(dialog)[0];
    if (first) first.focus();
    else { dialog.setAttribute("tabindex", "-1"); dialog.focus(); }
    emit(overlay, "kds:open", {});
  }

  function close(id, reason) {
    var overlay = byId(id);
    if (!overlay || !overlay.classList.contains("is-open")) return;
    overlay.classList.remove("is-open");
    var i = stack.indexOf(overlay);
    if (i > -1) stack.splice(i, 1);
    if (stack.length === 0) document.documentElement.style.overflow = document.documentElement.__kdsOverflow || "";
    var opener = overlay.__kdsOpener;
    if (opener && document.contains(opener) && typeof opener.focus === "function") opener.focus();
    emit(overlay, "kds:close", { reason: reason || "api" });
  }

  document.addEventListener("mousedown", function (e) { downTarget = e.target; }, true);

  document.addEventListener("click", function (e) {
    var t = e.target;
    var openBtn = t.closest && t.closest("[data-kds-open]");
    if (openBtn) { e.preventDefault(); open(openBtn.getAttribute("data-kds-open"), openBtn); return; }

    var closeBtn = t.closest && t.closest("[data-kds-close]");
    if (closeBtn) {
      var target = closeBtn.getAttribute("data-kds-close");
      var ov = target ? byId(target) : closeBtn.closest(".kds-overlay");
      if (ov) close(ov, "button");
      return;
    }

    // 배경(어두운 영역) 클릭: 누르기와 떼기가 모두 overlay 자체일 때만 닫는다 (안에서 드래그해 밖에서 뗀 경우 제외)
    if (t.classList && t.classList.contains("kds-overlay") && t.classList.contains("is-open") &&
        downTarget === t && !t.hasAttribute("data-kds-static")) {
      close(t, "backdrop");
    }
  });

  document.addEventListener("keydown", function (e) {
    var top = stack[stack.length - 1];
    if (top) {
      if (e.key === "Escape" && !top.hasAttribute("data-kds-static")) { e.preventDefault(); close(top, "escape"); return; }
      if (e.key === "Tab") {
        var dialog = top.querySelector('[role="dialog"], .kds-popup, .kds-sheet') || top;
        var items = focusables(dialog);
        if (items.length === 0) { e.preventDefault(); return; }
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
      }
    }
    onTabKey(e);
  });

  /* ── 토스트 ───────────────────────────── */
  var toastEl = null, toastTimer = 0;
  function toast(message, ms) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "kds-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    clearTimeout(toastTimer);
    toastEl.classList.remove("is-open");
    // 같은 문구를 다시 띄워도 스크린리더가 읽도록 한 프레임 뒤에 넣는다
    requestAnimationFrame(function () {
      toastEl.textContent = message;
      toastEl.classList.add("is-open");
      toastTimer = setTimeout(function () { toastEl.classList.remove("is-open"); }, ms || 2500);
    });
  }

  /* ── 탭 ──────────────────────────────── */
  function tabsOf(list) {
    return Array.prototype.filter.call(list.querySelectorAll('[role="tab"]'), function (t) { return t.closest('[role="tablist"]') === list; });
  }
  function selectTab(tab, focus) {
    var list = tab.closest('[role="tablist"]');
    if (!list || tab.disabled || tab.getAttribute("aria-disabled") === "true") return;
    tabsOf(list).forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.setAttribute("tabindex", on ? "0" : "-1");
      var panelId = t.getAttribute("aria-controls");
      var panel = panelId && document.getElementById(panelId);
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
    emit(list, "kds:change", { tab: tab });
  }
  function onTabKey(e) {
    var tab = e.target.closest && e.target.closest('[role="tab"]');
    if (!tab) return;
    var list = tab.closest('[role="tablist"]');
    if (!list) return;
    var tabs = tabsOf(list).filter(function (t) { return !t.disabled; });
    var i = tabs.indexOf(tab), next = null;
    if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
    else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === "Home") next = tabs[0];
    else if (e.key === "End") next = tabs[tabs.length - 1];
    if (next) { e.preventDefault(); selectTab(next, true); }
  }
  document.addEventListener("click", function (e) {
    var tab = e.target.closest && e.target.closest('[role="tablist"] [role="tab"]');
    if (tab) selectTab(tab, false);
  });

  /* ── 단일·복수 선택 ───────────────────── */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-kds-select] button");
    if (!btn || btn.disabled) return;
    var group = btn.closest("[data-kds-select]");
    var buttons = Array.prototype.filter.call(group.querySelectorAll("button"), function (b) { return b.closest("[data-kds-select]") === group; });
    if (group.getAttribute("data-kds-select") === "multi") {
      btn.setAttribute("aria-pressed", btn.getAttribute("aria-pressed") === "true" ? "false" : "true");
    } else {
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
    }
    var values = buttons.filter(function (b) { return b.getAttribute("aria-pressed") === "true"; })
      .map(function (b) { return b.value || b.getAttribute("data-value") || b.textContent.trim(); });
    emit(group, "kds:change", { values: values });
  });

  /* ── 입력 임시저장 ────────────────────── */
  function draft(form, key, options) {
    form = byId(form);
    var storage;
    try { storage = options && options.session ? window.sessionStorage : window.localStorage; } catch { storage = null; }
    var storeKey = "kds-draft:" + key;
    function fields() {
      return Array.prototype.filter.call(form.elements, function (el) {
        return el.name && !el.disabled && el.type !== "password" && el.type !== "file" &&
          el.type !== "submit" && el.type !== "button" && !el.hasAttribute("data-kds-no-draft");
      });
    }
    function read() {
      if (!storage) return null;
      try { return JSON.parse(storage.getItem(storeKey) || "null"); } catch { return null; }
    }
    function save() {
      if (!storage) return;
      var data = {};
      fields().forEach(function (el) {
        if (el.type === "checkbox" || el.type === "radio") {
          if (!data[el.name]) data[el.name] = [];
          if (el.checked) data[el.name].push(el.value);
        } else data[el.name] = el.value;
      });
      try { storage.setItem(storeKey, JSON.stringify({ at: Date.now(), data: data })); } catch { /* 저장 공간 없음: 화면 동작은 계속 */ }
    }
    var timer = 0;
    function onInput() { clearTimeout(timer); timer = setTimeout(save, 300); }
    var saved = read();
    form.addEventListener("input", onInput);
    form.addEventListener("change", onInput);
    return {
      saved: saved,
      restore: function () {
        var s = read();
        if (!s) return false;
        fields().forEach(function (el) {
          var v = s.data[el.name];
          if (v === undefined) return;
          if (el.type === "checkbox" || el.type === "radio") el.checked = v.indexOf(el.value) > -1;
          else el.value = v;
        });
        return true;
      },
      clear: function () { clearTimeout(timer); if (storage) try { storage.removeItem(storeKey); } catch { /* 무시 */ } },
      destroy: function () { form.removeEventListener("input", onInput); form.removeEventListener("change", onInput); }
    };
  }

  /* ── 처음 상태 맞추기 ─────────────────── */
  function init(root) {
    root = root || document;
    Array.prototype.forEach.call(root.querySelectorAll('[role="tablist"]'), function (list) {
      var tabs = tabsOf(list);
      var current = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0] || tabs[0];
      if (current) tabs.forEach(function (t) {
        var on = t === current;
        t.setAttribute("tabindex", on ? "0" : "-1");
        var panel = t.getAttribute("aria-controls") && document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { init(); });
  else init();

  window.KDS = { __behavior: true, open: open, close: close, toast: toast, selectTab: selectTab, draft: draft, init: init };
})();
