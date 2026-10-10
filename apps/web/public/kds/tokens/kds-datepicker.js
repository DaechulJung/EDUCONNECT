/**
 * KDS 2.0 날짜 선택 — 해커톤판
 * <script src="tokens/kds-datepicker.js" defer></script> 를 넣으면
 * .kds-datepicker 안의 input을 누를 때 KDS 달력이 열린다.
 *
 *   <span class="kds-datepicker"><input class="kds-field__input" placeholder="날짜 선택" readonly data-min="today"></span>
 *
 * - 값 형식: 2026.10.14 (input.value) / 고르면 input에 change 이벤트
 * - data-min="today" 또는 data-min="2026.10.01": 그 전 날짜는 고를 수 없음
 * - 나중에 화면에 추가한 입력창도 동작한다 (문서 전체에서 클릭을 받음)
 */
(function () {
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  const parse = (s) => {
    if (!s) return null;
    if (s === 'today') { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
    const m = s.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  };
  const same = (a, b) => a && b && a.getTime() === b.getTime();
  const iconBtn = (dir, label) =>
    `<button type="button" class="kds-icon-button" data-move="${dir}" aria-label="${label}"><span class="kds-icon" style="--icon:url(${base}icons/ic-line-chevron_${dir < 0 ? 'left' : 'right'}.svg)" aria-hidden="true"></span></button>`;

  // 아이콘 경로: 이 스크립트 위치(tokens/) 기준으로 ../icons/
  const me = document.currentScript && document.currentScript.src;
  const base = me ? me.replace(/tokens\/kds-datepicker\.js.*$/, '') : '';

  let open = null; // { input, cal, view }

  function render() {
    const { input, cal, view } = open;
    const sel = parse(input.value);
    const min = parse(input.dataset.min);
    const t = new Date(); const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    const y = view.getFullYear(), m = view.getMonth();
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    let cells = DOW.map((d) => `<span class="kds-calendar__dow">${d}</span>`).join('');
    for (let i = 0; i < first; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d);
      const cls = ['kds-calendar__day', date.getDay() === 0 ? 'is-sunday' : '', same(date, today) ? 'is-today' : ''].join(' ').trim();
      const off = min && date < min ? ' disabled' : '';
      cells += `<button type="button" class="${cls}" data-day="${d}" aria-pressed="${same(date, sel)}"${off}><span>${d}</span></button>`;
    }
    cal.innerHTML =
      `<div class="kds-calendar__head">${iconBtn(-1, '이전 달')}<span class="kds-calendar__title">${y}년 ${m + 1}월</span>${iconBtn(1, '다음 달')}</div>` +
      `<div class="kds-calendar__grid">${cells}</div>`;
  }

  function close() {
    if (!open) return;
    open.cal.remove();
    open.input.setAttribute('aria-expanded', 'false');
    open = null;
  }

  function show(input) {
    close();
    const cal = document.createElement('div');
    cal.className = 'kds-calendar';
    cal.setAttribute('role', 'dialog');
    cal.setAttribute('aria-label', '날짜 선택');
    input.parentElement.appendChild(cal);
    input.setAttribute('aria-expanded', 'true');
    const start = parse(input.value) || parse(input.dataset.min) || new Date();
    open = { input, cal, view: new Date(start.getFullYear(), start.getMonth(), 1) };
    render();
  }

  document.addEventListener('click', (e) => {
    const input = e.target.closest('.kds-datepicker > input');
    if (input) { if (open && open.input === input) close(); else show(input); return; }
    if (!open || !open.cal.contains(e.target)) { close(); return; }
    const move = e.target.closest('[data-move]');
    if (move) { open.view.setMonth(open.view.getMonth() + Number(move.dataset.move)); render(); return; }
    const day = e.target.closest('[data-day]');
    if (day && !day.disabled) {
      const { input, view } = open;
      // React 같은 프레임워크가 값 변경을 알아채도록 네이티브 setter로 넣고 input·change를 모두 보낸다
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setValue.call(input, fmt(new Date(view.getFullYear(), view.getMonth(), Number(day.dataset.day))));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      close();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.kds-datepicker > input')) { e.preventDefault(); show(e.target); }
  });
})();
