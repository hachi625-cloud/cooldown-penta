'use strict';
// イラスト（インラインSVG）。キャラクター：ペンタ（ペンギン）、いかりん（いかりの ほのお）

window.ART = (function () {
  const NAVY = '#2c3e57', INK = '#243447', BEAK = '#f5a623', CHEEK = '#ff9aa2', SCARF = '#4aa8d8';

  // ---------- ペンタ ----------
  // mood: normal | happy | cheer | worry | calm | think
  function penta(mood = 'normal') {
    const up = mood === 'cheer';
    const flipL = up
      ? '<ellipse cx="22" cy="44" rx="9" ry="22" transform="rotate(35 22 44)" fill="' + NAVY + '"/>'
      : '<ellipse cx="22" cy="74" rx="9" ry="22" transform="rotate(20 22 74)" fill="' + NAVY + '"/>';
    const flipR = up || mood === 'think'
      ? '<ellipse cx="98" cy="44" rx="9" ry="22" transform="rotate(-35 98 44)" fill="' + NAVY + '"/>'
      : '<ellipse cx="98" cy="74" rx="9" ry="22" transform="rotate(-20 98 74)" fill="' + NAVY + '"/>';
    let eyes;
    if (mood === 'happy' || mood === 'cheer') {
      eyes = `<path d="M43 47 q6 -7 12 0" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
              <path d="M65 47 q6 -7 12 0" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    } else if (mood === 'calm') {
      eyes = `<path d="M43 45 q6 6 12 0" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
              <path d="M65 45 q6 6 12 0" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    } else {
      eyes = `<circle cx="49" cy="46" r="5" fill="${INK}"/><circle cx="71" cy="46" r="5" fill="${INK}"/>
              <circle cx="50.5" cy="44.5" r="1.6" fill="#fff"/><circle cx="72.5" cy="44.5" r="1.6" fill="#fff"/>`;
    }
    const brows = mood === 'worry'
      ? `<path d="M42 37 l12 -4" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M78 37 l-12 -4" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
      : '';
    const extra = mood === 'worry'
      ? '<path d="M88 26 q5 8 0 11 q-5 -3 0 -11z" fill="#8fd3f5"/>'
      : mood === 'think'
        ? `<text x="96" y="22" font-size="22" font-weight="700" fill="${SCARF}" font-family="sans-serif">?</text>`
        : mood === 'cheer'
          ? '<path d="M10 16 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" fill="#f7c843"/>'
          : '';
    const beak = mood === 'happy' || mood === 'cheer'
      ? `<path d="M53 55 L67 55 L60 64 Z" fill="${BEAK}"/><path d="M55 58 q5 5 10 0" fill="#e8574a"/>`
      : `<path d="M53 55 L67 55 L60 63 Z" fill="${BEAK}"/>`;
    return `<svg class="art art-penta" viewBox="0 0 120 124" role="img" aria-label="ペンタ">
      <ellipse cx="45" cy="116" rx="14" ry="6" fill="${BEAK}"/><ellipse cx="75" cy="116" rx="14" ry="6" fill="${BEAK}"/>
      ${flipL}${flipR}
      <ellipse cx="60" cy="68" rx="40" ry="48" fill="${NAVY}"/>
      <ellipse cx="60" cy="86" rx="27" ry="28" fill="#fff"/>
      <ellipse cx="60" cy="49" rx="29" ry="22" fill="#fff"/>
      <path d="M31 64 q29 12 58 0 l0 8 q-29 12 -58 0z" fill="${SCARF}"/>
      <rect x="70" y="70" width="9" height="18" rx="4" fill="${SCARF}" transform="rotate(-12 74 79)"/>
      <circle cx="41" cy="56" r="5" fill="${CHEEK}" opacity=".6"/><circle cx="79" cy="56" r="5" fill="${CHEEK}" opacity=".6"/>
      ${brows}${eyes}${beak}${extra}
    </svg>`;
  }

  // ---------- いかりん ----------
  const FLAME = [null,
    ['#ffd76a', '#fff3c4'],
    ['#ffbf47', '#ffe39a'],
    ['#ff9a3c', '#ffcf86'],
    ['#ff6a3d', '#ffac7e'],
    ['#e8392f', '#ff9466'],
  ];
  const OUTER = 'M50 4 C60 22 84 34 84 60 C84 81 69 96 50 96 C31 96 16 81 16 60 C16 44 28 37 32 22 C38 32 41 38 45 40 C45 28 44 16 50 4 Z';
  const INNER = 'M50 40 C56 50 70 56 70 70 C70 82 61 90 50 90 C39 90 30 82 30 70 C30 58 44 54 50 40 Z';

  function ikarin(level = 3) {
    const n = Math.min(5, Math.max(1, +level));
    const [o, i] = FLAME[n];
    const faces = {
      1: `<path d="M38 66 q4 -4 8 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M54 66 q4 -4 8 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M45 75 q5 5 10 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      2: `<circle cx="42" cy="66" r="3.6" fill="${INK}"/><circle cx="58" cy="66" r="3.6" fill="${INK}"/>
          <path d="M45 77 h10" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
      3: `<path d="M36 59 l9 3" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M64 59 l-9 3" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
          <circle cx="42" cy="67" r="3.6" fill="${INK}"/><circle cx="58" cy="67" r="3.6" fill="${INK}"/>
          <path d="M44 79 q6 -4 12 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      4: `<path d="M34 57 l12 6" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/><path d="M66 57 l-12 6" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>
          <circle cx="42" cy="68" r="3.8" fill="${INK}"/><circle cx="58" cy="68" r="3.8" fill="${INK}"/>
          <path d="M42 81 q8 -7 16 0" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`,
      5: `<path d="M33 55 l13 8" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M67 55 l-13 8" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
          <circle cx="42" cy="68" r="4" fill="${INK}"/><circle cx="58" cy="68" r="4" fill="${INK}"/>
          <ellipse cx="50" cy="81" rx="8" ry="6" fill="${INK}"/><ellipse cx="50" cy="83" rx="4.5" ry="2.6" fill="#ff6f6f"/>
          <g stroke="#b01e16" stroke-width="3" stroke-linecap="round" fill="none">
            <path d="M74 20 q4 4 0 8"/><path d="M84 20 q-4 4 0 8"/><path d="M75 16 q4 4 8 0"/><path d="M75 32 q4 -4 8 0"/>
          </g>`,
    };
    return `<svg class="art art-ikarin" viewBox="0 0 100 100" role="img" aria-label="いかりん ${n}">
      <path d="${OUTER}" fill="${o}"/><path d="${INNER}" fill="${i}"/>
      ${n >= 3 ? `<circle cx="34" cy="74" r="4" fill="${CHEEK}" opacity=".5"/><circle cx="66" cy="74" r="4" fill="${CHEEK}" opacity=".5"/>` : ''}
      ${faces[n]}
    </svg>`;
  }

  // ---------- しんごう ----------
  function signal(active = '') {
    const lamp = (cx, color, on, label) =>
      `<circle cx="${cx}" cy="40" r="22" fill="${color}" opacity="${!active || on ? 1 : 0.25}"/>
       <text x="${cx}" y="94" text-anchor="middle" font-size="14" font-weight="700" fill="${INK}" font-family="sans-serif">${label}</text>`;
    return `<svg class="art art-signal" viewBox="0 0 240 104" role="img" aria-label="しんごう">
      <rect x="18" y="10" width="204" height="60" rx="30" fill="${INK}"/>
      ${lamp(50, '#ec5d4f', active === 'red', 'とまる')}
      ${lamp(120, '#f7c843', active === 'yellow', 'おちつく')}
      ${lamp(190, '#5cbf7a', active === 'green', 'やってみる')}
    </svg>`;
  }

  // ---------- いかりの スイッチ ----------
  function switchArt() {
    return `<svg class="art art-switch" viewBox="0 0 200 120" role="img" aria-label="いかりの スイッチ">
      <rect x="18" y="20" width="70" height="90" rx="14" fill="#fff" stroke="#d7cbb6" stroke-width="4"/>
      <rect x="38" y="34" width="30" height="62" rx="8" fill="#e6dccb"/>
      <rect x="40" y="36" width="26" height="30" rx="6" fill="#ec5d4f"/>
      <text x="53" y="56" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="sans-serif">ON</text>
      <path d="M96 64 q14 -12 26 -4" stroke="#f5a04a" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="4 6"/>
      <g transform="translate(118 18) scale(.8)">${inner(ikarin(4))}</g>
    </svg>`;
  }

  // ---------- ペンタと いかりん（ともだち） ----------
  function friends(level = 2) {
    return `<svg class="art art-friends" viewBox="0 0 230 124" role="img" aria-label="ペンタと いかりん">
      <g>${inner(penta('happy'))}</g>
      <g transform="translate(130 24) scale(.95)">${inner(ikarin(level))}</g>
    </svg>`;
  }

  // svg の なかみ だけを とりだす（くみあわせ よう）
  function inner(svg) { return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''); }

  // 'art:ikarin:3' → ikarin(3)
  function resolve(key) {
    const [name, ...args] = key.split(':');
    const fn = { penta, ikarin, signal, switch: switchArt, friends }[name];
    return fn ? fn(...args) : '';
  }

  return { penta, ikarin, signal, switchArt, friends, resolve };
})();
