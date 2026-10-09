// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { DEFAULT_CHARACTER, shade } from '../../lib/game'
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef } from 'react'

export const INK = "#1d1b1a";
export const GOLD = "#e0a526";
export const SHOULDER_PATH = "M10 250 L10 222 C10 198 40 182 84 178 L116 178 C160 182 190 198 190 222 L190 250 Z";
export const DEFAULT_SHIRT_PATH = SHOULDER_PATH;
export function clothesColors(e, t, n) {
  switch (e) {
    case "tank":
      return {
        body: t,
        sleeve: n,
        leftSleeve: shade(n, 0.1)
      };
    case "suit":
      return {
        body: "#262b3d",
        sleeve: "#262b3d",
        leftSleeve: "#1d2130"
      };
    default:
      return {
        body: t,
        sleeve: t,
        leftSleeve: shade(t, 0.16)
      };
  }
}
export function HoodieCollarBack({
  clothes: e,
  shirt: t
}) {
  return e === "hoodie" ? <path d="M58 170 C52 140 70 128 100 128 C130 128 148 140 142 170 C128 182 72 182 58 170 Z" fill={shade(t, 0.2)} /> : null;
}
export function Clothes({
  clothes: e,
  shirt: t,
  skin: n
}) {
  switch (e) {
    case "tank":
      return <g><path d={SHOULDER_PATH} fill={n} /><path d="M46 250 L46 216 C52 202 68 192 84 186 L91 196 Q100 210 109 196 L116 186 C132 192 148 202 154 216 L154 250 Z" fill={t} /></g>;
    case "hoodie":
      return <g><path d={SHOULDER_PATH} fill={t} /><path d="M84 178 Q100 200 116 178 Q100 186 84 178 Z" fill={shade(t, 0.25)} /><path d="M93 192 L91 218 M107 192 L109 216" stroke="#fff" strokeOpacity="0.85" strokeWidth="3" strokeLinecap="round" /><path d="M62 240 Q100 226 138 240" fill="none" stroke={shade(t, 0.25)} strokeWidth="3" strokeLinecap="round" /></g>;
    case "jacket":
      return <g><path d={SHOULDER_PATH} fill={t} /><path d="M100 190 L100 250" stroke="#e8eeea" strokeWidth="3.5" /><path d="M84 178 L98 196 L96 182 Z M116 178 L102 196 L104 182 Z" fill={shade(t, 0.3)} /><path d="M30 214 Q60 200 84 192 M170 214 Q140 200 116 192" fill="none" stroke="#e8eeea" strokeOpacity="0.8" strokeWidth="4" strokeLinecap="round" /></g>;
    case "jersey":
      return <g><path d={SHOULDER_PATH} fill={t} />{[196, 212, 228, 244].map(e => <rect x="8" y={e} width="184" height="8" fill="#fff" fillOpacity="0.28" key={e} />)}<path d="M84 178 Q100 200 116 178" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" /><text x="100" y="236" textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight="800" fontSize="26" fill="#fff" fillOpacity="0.9">10</text></g>;
    case "suit":
      return <g><path d={SHOULDER_PATH} fill="#262b3d" /><path d="M84 178 L100 226 L116 178 Z" fill="#f2f4f3" /><path d="M100 194 L94 204 L100 246 L106 204 Z" fill="#075640" /><path d="M84 178 L96 232 L80 250 M116 178 L104 232 L120 250" fill="none" stroke="#161a28" strokeWidth="3" strokeLinejoin="round" /></g>;
    default:
      return null;
  }
}
export function Neckwear({
  item: e
}) {
  switch (e) {
    case "scarf":
      return <g><path d="M78 168 Q100 190 122 168 L126 186 Q100 204 74 186 Z" fill="#c4461f" /><path d="M108 190 L126 186 L130 232 L110 228 Z" fill="#a83a19" /><path d="M110 208 L128 210 M110 218 L129 220" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" /></g>;
    case "medal":
      return <g><path d="M86 178 L100 216 L114 178" fill="none" stroke="#c4461f" strokeWidth="7" strokeLinejoin="round" /><circle cx="100" cy="224" r="13" fill={GOLD} stroke="#b9831a" strokeWidth="2" /><path d="M100 215 L103 222 L110 223 L105 228 L106 235 L100 231 L94 235 L95 228 L90 223 L97 222 Z" fill="#fff3c4" /></g>;
    case "goldchain":
      return <g><path d="M82 178 Q100 218 118 178" fill="none" stroke={GOLD} strokeWidth="4.5" strokeLinecap="round" strokeDasharray="1 5.5" /><path d="M82 178 Q100 218 118 178" fill="none" stroke={GOLD} strokeWidth="2.6" strokeLinecap="round" /><circle cx="100" cy="204" r="7.5" fill={GOLD} stroke="#b9831a" strokeWidth="1.6" /><path d="M97 204 H103 M100 200.5 V207.5" stroke="#fff3c4" strokeWidth="1.8" strokeLinecap="round" /></g>;
    default:
      return null;
  }
}
export function Glasses({
  item: e
}) {
  return e === "glasses" ? <g fill="#fff" fillOpacity="0.1" stroke={INK} strokeWidth="3.2" strokeLinecap="round"><circle cx="82" cy="96" r="14" /><circle cx="118" cy="96" r="14" /><path d="M96 94 Q100 90 104 94" fill="none" /><path d="M68 94 L55 91 M132 94 L145 91" fill="none" /></g> : e === "sunglasses" ? <g><path d="M95 94 Q100 90 105 94" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" /><path d="M66 86 H96 V99 Q96 111 85 111 H77 Q66 111 66 99 Z" fill={INK} /><path d="M104 86 H134 V99 Q134 111 123 111 H115 Q104 111 104 99 Z" fill={INK} /><path d="M72 91 L84 91 M110 91 L122 91" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" /><path d="M66 88 L54 86 M134 88 L146 86" stroke={INK} strokeWidth="3.4" strokeLinecap="round" /></g> : null;
}
export function Headwear({
  item: e
}) {
  switch (e) {
    case "headband":
      return <g><path d="M53 72 Q100 54 147 72 L147 84 Q100 66 53 84 Z" fill="#075640" /><path d="M100 66 L95 74 H99 L97 81 L105 72 H101 Z" fill="#fff" fillOpacity="0.9" /></g>;
    case "cap":
      return <g><path d="M52 82 C48 42 74 28 100 28 C126 28 152 42 148 82 C130 72 70 72 52 82 Z" fill="#075640" /><path d="M46 84 Q100 108 154 84 Q154 76 138 74 Q100 86 62 74 Q46 76 46 84 Z" fill="#054433" /><path d="M101 46 L93 62 H99 L96 74 L108 58 H102 Z" fill="#fff" fillOpacity="0.92" /></g>;
    case "beanie":
      return <g><path d="M52 84 C46 36 76 24 100 24 C124 24 154 36 148 84 Z" fill="#c4461f" /><path d="M49 72 Q100 86 151 72 L152 90 Q100 104 48 90 Z" fill="#a83a19" />{[62, 78, 94, 110, 126, 140].map(e => <path d={`M${e} 76 L${e} 94`} stroke="#c4461f" strokeWidth="2.4" key={e} />)}<circle cx="100" cy="21" r="11" fill="#e8654a" /></g>;
    case "cowboy":
      return <g><ellipse cx="100" cy="76" rx="80" ry="15" fill="#8a5a2b" /><path d="M66 74 C62 36 80 26 100 30 C120 26 138 36 134 74 Z" fill="#9c6a35" /><path d="M66 66 Q100 76 134 66 L134 74 Q100 84 66 74 Z" fill="#4a3018" /><path d="M82 40 Q100 48 118 40" fill="none" stroke="#8a5a2b" strokeWidth="3" strokeLinecap="round" /></g>;
    case "crown":
      return <g><path d="M62 68 L60 36 L80 54 L100 26 L120 54 L140 36 L138 68 Z" fill={GOLD} stroke="#b9831a" strokeWidth="2" strokeLinejoin="round" /><rect x="62" y="62" width="76" height="9" rx="3" fill="#c98f18" /><circle cx="60" cy="35" r="4.5" fill="#e0443a" /><circle cx="100" cy="25" r="5" fill="#2a80d6" /><circle cx="140" cy="35" r="4.5" fill="#e0443a" /></g>;
    default:
      return null;
  }
}
export function Pet({
  item: e
}) {
  switch (e) {
    case "dog":
      return <g><path d="M14 250 C14 232 24 224 38 224 C52 224 62 232 62 250 Z" fill="#b57b45" /><ellipse cx="22" cy="206" rx="9" ry="16" fill="#7a4a24" transform="rotate(18 22 206)" /><ellipse cx="54" cy="206" rx="9" ry="16" fill="#7a4a24" transform="rotate(-18 54 206)" /><circle cx="38" cy="210" r="19" fill="#c78d52" /><ellipse cx="38" cy="219" rx="11" ry="8" fill="#f1d9b8" /><ellipse cx="38" cy="215" rx="4.5" ry="3.4" fill={INK} /><circle cx="31" cy="205" r="2.6" fill={INK} /><circle cx="45" cy="205" r="2.6" fill={INK} /><path d="M34 222 Q38 227 42 222" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" /></g>;
    case "cat":
      return <g><path d="M14 250 C14 232 24 224 38 224 C52 224 62 232 62 250 Z" fill="#8f98a3" /><path d="M20 200 L22 180 L34 194 Z M56 200 L54 180 L42 194 Z" fill="#7a838e" /><path d="M23 196 L24 186 L31 194 Z M53 196 L52 186 L45 194 Z" fill="#f0a6b4" /><circle cx="38" cy="210" r="19" fill="#a4adb8" /><ellipse cx="31" cy="206" rx="3" ry="3.8" fill="#1d1b1a" /><ellipse cx="45" cy="206" rx="3" ry="3.8" fill="#1d1b1a" /><path d="M36 213 L40 213 L38 216 Z" fill="#e8869a" /><path d="M38 216 Q34 221 30 219 M38 216 Q42 221 46 219" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" /><path d="M24 214 L12 212 M24 217 L12 220 M52 214 L64 212 M52 217 L64 220" stroke="#e8eeea" strokeWidth="1.4" strokeLinecap="round" /></g>;
    case "bunny":
      return <g><path d="M14 250 C14 234 24 228 38 228 C52 228 62 234 62 250 Z" fill="#f4f1ec" /><ellipse cx="29" cy="190" rx="6.5" ry="20" fill="#f4f1ec" transform="rotate(-8 29 190)" /><ellipse cx="47" cy="190" rx="6.5" ry="20" fill="#f4f1ec" transform="rotate(8 47 190)" /><ellipse cx="29" cy="191" rx="3" ry="14" fill="#f2b3c0" transform="rotate(-8 29 191)" /><ellipse cx="47" cy="191" rx="3" ry="14" fill="#f2b3c0" transform="rotate(8 47 191)" /><circle cx="38" cy="216" r="17" fill="#f4f1ec" /><circle cx="32" cy="213" r="2.4" fill={INK} /><circle cx="44" cy="213" r="2.4" fill={INK} /><ellipse cx="38" cy="219" rx="3" ry="2.2" fill="#e8869a" /><path d="M38 221 L38 224 M38 224 Q34 227 31 225 M38 224 Q42 227 45 225" fill="none" stroke="#b8aea0" strokeWidth="1.5" strokeLinecap="round" /></g>;
    case "turtle":
      return <g><ellipse cx="34" cy="243" rx="25" ry="15" fill="#3f9a5a" /><path d="M14 243 Q34 214 54 243 Z" fill="#2d7a45" /><path d="M24 236 L44 236 M20 243 L48 243 M34 224 L34 243" stroke="#256a3a" strokeWidth="2" /><circle cx="62" cy="238" r="9" fill="#6bb87c" /><circle cx="65" cy="236" r="2" fill={INK} /><path d="M60 242 Q64 245 68 242" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" /><rect x="14" y="248" width="9" height="5" rx="2.5" fill="#6bb87c" /><rect x="44" y="248" width="9" height="5" rx="2.5" fill="#6bb87c" /></g>;
    case "fox":
      return <g><path d="M14 250 C14 232 24 224 38 224 C52 224 62 232 62 250 Z" fill="#d9692a" /><path d="M20 202 L20 180 L35 194 Z M56 202 L56 180 L41 194 Z" fill="#c75a1c" /><path d="M23 197 L23 187 L31 194 Z M53 197 L53 187 L45 194 Z" fill="#2a2320" /><path d="M18 208 Q38 200 58 208 Q56 228 38 232 Q20 228 18 208 Z" fill="#e8772f" /><path d="M18 212 Q26 226 38 228 Q50 226 58 212 Q48 224 38 224 Q28 224 18 212 Z" fill="#fbeadb" /><circle cx="30" cy="210" r="2.4" fill={INK} /><circle cx="46" cy="210" r="2.4" fill={INK} /><ellipse cx="38" cy="221" rx="3.6" ry="2.6" fill={INK} /></g>;
    default:
      return null;
  }
}
export const SHOULDER = {
  x: 156,
  y: 186
};
export const UPPER_ARM = 36;
export const FOREARM = 36;
export const MOUTH_POINT = {
  x: 103,
  y: 127
};
export const HAND_HOLD = {
  x: 140,
  y: 208
};
export const HAND_REST = {
  x: 172,
  y: 262
};
export const SIP_START_ANGLE = -62;
export const SIP_END_ANGLE = -97;
export const BOTTLE_PATH = "M-12 -22 L-12 22 Q-12 26 -8 26 L8 26 Q12 26 12 22 L12 -22 C12 -28 5 -30 5 -34 L5 -37 L-5 -37 L-5 -34 C-5 -30 -12 -28 -12 -22 Z";
export const BOTTLE_POINTS = (() => {
  let e = [];
  for (let t = -11; t <= 11; t += 2) for (let n = -21; n <= 25; n += 2) e.push([t, n]);
  for (let t = -4; t <= 4; t += 2) for (let n = -36; n <= -23; n += 2) e.push([t, n]);
  return e;
})();
export const toRad = e => e * Math.PI / 180;
export const clamp01 = e => Math.min(1, Math.max(0, e));
export const lerp = (e, t, n) => e + (t - e) * n;
export const easeOutCubic = e => 1 - (1 - e) ** 3;
export const easeInCubic = e => e * e * e;
export const easeInOutCubic = e => e < 0.5 ? 4 * e * e * e : 1 - (-2 * e + 2) ** 3 / 2;
export const segment = (e, t, n) => clamp01((e - t) / (n - t));
export function elbowPoint(e, t) {
  let n = t.x - e.x,
    r = t.y - e.y,
    i = Math.min(Math.max(Math.hypot(n, r), Math.abs(UPPER_ARM - FOREARM) + 0.01), 71.99),
    a = Math.hypot(n, r) || 1,
    o = n / a,
    s = r / a,
    c = (UPPER_ARM * UPPER_ARM - FOREARM * FOREARM + i * i) / (2 * i),
    l = Math.sqrt(Math.max(0, UPPER_ARM * UPPER_ARM - c * c)),
    u = e.x + o * c,
    d = e.y + s * c,
    f = {
      x: u - s * l,
      y: d + o * l
    },
    p = {
      x: u + s * l,
      y: d - o * l
    };
  return f.x >= p.x ? f : p;
}
export function bottleScale(e) {
  return e <= 350 ? 0.86 : e <= 550 ? 1 : e <= 800 ? 1.1 : 1.2;
}
export function waterLevel(e, t) {
  if (t >= 0.999) return -60;
  if (t <= 0.001) return 60;
  let n = Math.sin(toRad(e)),
    r = Math.cos(toRad(e)),
    i = BOTTLE_POINTS.map(([e, t]) => e * n + t * r).sort((e, t) => e - t);
  return i[Math.min(i.length - 1, Math.floor((1 - t) * i.length))];
}
export function FaceShape({
  shape: e,
  fill: t
}) {
  return e === "oval" ? <ellipse cx="100" cy="94" rx="42" ry="54" fill={t} /> : e === "square" ? <rect x="56" y="42" width="88" height="102" rx="32" fill={t} /> : <ellipse cx="100" cy="94" rx="47" ry="49" fill={t} />;
}
export function HairBack({
  c: e
}) {
  let t = e.hairColor;
  return e.hairStyle === "long" ? <path d="M48 92 C36 140 44 176 58 190 L142 190 C156 176 164 140 152 92 Z" fill={t} /> : e.hairStyle === "ponytail" ? <path d="M140 66 C176 62 190 108 172 150 C170 124 160 104 142 94 Z" fill={t} /> : e.hairStyle === "bun" ? <circle cx="100" cy="34" r="17" fill={t} /> : null;
}
export function HairFront({
  c: e
}) {
  let t = e.hairColor;
  switch (e.hairStyle) {
    case "bald":
      return null;
    case "buzz":
      return <path d="M54 88 C50 52 76 38 100 38 C124 38 150 52 146 88 C139 70 122 64 100 64 C78 64 61 70 54 88 Z" fill={t} opacity="0.92" />;
    case "side":
      return <path d="M52 90 C44 52 74 34 104 36 C132 38 152 56 148 90 C142 74 126 62 104 62 C92 74 74 76 52 90 Z" fill={t} />;
    case "curly":
      return <g fill={t}>{[[56, 70, 15], [70, 52, 16], [90, 44, 16], [112, 44, 16], [132, 52, 16], [146, 70, 15], [100, 56, 14]].map(([e, t, n], r) => <circle cx={e} cy={t} r={n} key={r} />)}</g>;
    default:
      return <path d="M54 90 C48 52 76 36 100 36 C124 36 152 52 146 90 C140 72 124 62 100 62 C76 62 60 72 54 90 Z" fill={t} />;
  }
}
export function Eyes({
  style: e,
  closed: t
}) {
  let n = "#1d1b1a";
  if (t) return <g fill="none" stroke={n} strokeWidth="3.2" strokeLinecap="round"><path d="M75 95 Q82 101 89 95" /><path d="M111 95 Q118 101 125 95" /></g>;
  switch (e) {
    case "happy":
      return <g fill="none" stroke={n} strokeWidth="3.4" strokeLinecap="round"><path d="M75 97 Q82 88 89 97" /><path d="M111 97 Q118 88 125 97" /></g>;
    case "wide":
      return <g><ellipse cx="82" cy="95" rx="7.5" ry="8.5" fill="#fff" stroke={n} strokeWidth="1.6" /><circle cx="83" cy="96" r="4.2" fill={n} /><ellipse cx="118" cy="95" rx="7.5" ry="8.5" fill="#fff" stroke={n} strokeWidth="1.6" /><circle cx="119" cy="96" r="4.2" fill={n} /></g>;
    case "calm":
      return <g><ellipse cx="82" cy="96" rx="5.5" ry="4" fill={n} /><ellipse cx="118" cy="96" rx="5.5" ry="4" fill={n} /><path d="M75 92 Q82 89 89 92" fill="none" stroke={n} strokeWidth="2.4" strokeLinecap="round" /><path d="M111 92 Q118 89 125 92" fill="none" stroke={n} strokeWidth="2.4" strokeLinecap="round" /></g>;
    default:
      return <g fill={n}><circle cx="82" cy="96" r="4.8" /><circle cx="118" cy="96" r="4.8" /></g>;
  }
}
export function Brows({
  style: e,
  color: t
}) {
  return e === "strong" ? <g fill="none" stroke={t} strokeWidth="5" strokeLinecap="round"><path d="M73 83 L90 80" /><path d="M110 80 L127 83" /></g> : e === "thin" ? <g fill="none" stroke={t} strokeWidth="2.2" strokeLinecap="round"><path d="M74 82 Q82 77 90 80" /><path d="M110 80 Q118 77 126 82" /></g> : <g fill="none" stroke={t} strokeWidth="3.6" strokeLinecap="round"><path d="M74 83 Q82 77 90 81" /><path d="M110 81 Q118 77 126 83" /></g>;
}
export function Mouth({
  style: e
}) {
  let t = "#1d1b1a";
  switch (e) {
    case "grin":
      return <path d="M86 122 Q100 142 114 122 Z" fill="#fff" stroke={t} strokeWidth="2.6" strokeLinejoin="round" />;
    case "soft":
      return <path d="M92 127 Q100 131 108 127" fill="none" stroke={t} strokeWidth="3" strokeLinecap="round" />;
    case "open":
      return <g><ellipse cx="100" cy="128" rx="8" ry="7" fill={t} /><ellipse cx="100" cy="132" rx="4.5" ry="2.8" fill="#e0707a" /></g>;
    default:
      return <path d="M88 124 Q100 137 112 124" fill="none" stroke={t} strokeWidth="3.4" strokeLinecap="round" />;
  }
}
export function Beard({
  style: e,
  color: t,
  skin: n
}) {
  if (e === "none") return null;
  let r = "M54 100 Q58 146 100 148 Q142 146 146 100 Q132 120 100 120 Q68 120 54 100 Z";
  return e === "mustache" ? <path d="M84 118 Q92 112 100 116 Q108 112 116 118 Q108 122 100 120 Q92 122 84 118 Z" fill={t} /> : e === "stubble" ? <path d={r} fill={t} opacity="0.28" /> : <g><path d={e === "full" ? "M52 96 Q54 154 100 158 Q146 154 148 96 Q134 124 100 122 Q66 124 52 96 Z" : r} fill={t} /><ellipse cx="100" cy="127" rx="14" ry="9" fill={n} /></g>;
}
export const Avatar = forwardRef<any, any>(function ({
  config = DEFAULT_CHARACTER,
  size = 160,
  view = "bust",
  holdBottle = false,
  bottleMl = 500,
  equipped,
  idle = false,
  className,
  label = "Deine Figur"
}, ref) {
  let cfg = config,
    uid = useId().replace(/:/g, ""),
    scale = bottleScale(bottleMl),
    skinShade = shade(cfg.skin, 0.13),
    items = equipped ?? {},
    box = view === "head" ? {
      x: 22,
      y: 14,
      w: 156,
      h: 150
    } : {
      x: 0,
      y: 0,
      w: 200,
      h: 250
    },
    clothes = clothesColors(items.kleidung, cfg.shirt, cfg.skin),
    sleeveColor = clothes.sleeve,
    foreColor = items.kleidung && items.kleidung !== "tank" ? clothes.sleeve : cfg.skin,
    parts = useRef({}),
    partRef = e => t => {
      parts.current[e] = t;
    },
    frame = useRef(undefined),
    queue = useRef(Promise.resolve()),
    reducedMotion = useRef(false),
    animating = useRef(false),
    stateRef = useRef({
      holdBottle,
      scale
    });
  stateRef.current = {
    holdBottle,
    scale
  }, useEffect(() => {
    let e = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    reducedMotion.current = !!e?.matches;
    let t = () => {
      reducedMotion.current = !!e?.matches;
    };
    return e?.addEventListener?.("change", t), () => {
      e?.removeEventListener?.("change", t), frame.current && cancelAnimationFrame(frame.current);
    };
  }, []);
  let setPart = (e, t, n) => parts.current[e]?.setAttribute(t, String(n)),
    applyPose = useCallback(e => {
      let t = stateRef.current.scale,
        n = elbowPoint(SHOULDER, {
          x: e.hx,
          y: e.hy
        });
      setPart("upper", "x1", SHOULDER.x), setPart("upper", "y1", SHOULDER.y), setPart("upper", "x2", n.x), setPart("upper", "y2", n.y), setPart("fore", "x1", n.x), setPart("fore", "y1", n.y), setPart("fore", "x2", e.hx), setPart("fore", "y2", e.hy), setPart("hand", "cx", e.hx), setPart("hand", "cy", e.hy), setPart("bottle", "transform", `translate(${e.hx} ${e.hy}) rotate(${e.phi}) scale(${t})`), setPart("waterRot", "transform", `rotate(${-e.phi})`), setPart("water", "y", waterLevel(e.phi, e.fill)), setPart("eyesOpen", "opacity", 1 - e.closed), setPart("eyesClosed", "opacity", e.closed), setPart("head", "transform", `translate(0 ${-e.head * 3}) rotate(${-e.head * 3} 100 150)`), setPart("gulp", "opacity", e.gulp > 0 ? 0.9 : 0), setPart("gulp", "cy", 156 + e.gulp * 14), setPart("gulp", "r", 3 + Math.sin(e.gulp * Math.PI) * 2.4), setPart("sparks", "opacity", e.spark), setPart("sparks", "transform", `translate(0 ${(1 - e.spark) * 8})`), setPart("body", "transform", `translate(0 ${-e.hop})`);
    }, []),
    resetPose = useCallback(() => {
      let e = stateRef.current.holdBottle,
        t = e ? HAND_HOLD : HAND_REST;
      applyPose({
        hx: t.x,
        hy: t.y,
        phi: 0,
        fill: 1,
        closed: 0,
        head: 0,
        gulp: 0,
        spark: 0,
        hop: 0
      }), setPart("bottle", "opacity", +!!e);
    }, [applyPose]);
  useLayoutEffect(() => {
    resetPose();
  }, [resetPose, holdBottle, bottleMl]);
  let animate = useCallback((e, t) => new Promise(n => {
    let r = performance.now();
    animating.current = true;
    let i = a => {
      let o = clamp01((a - r) / e);
      t(o), o < 1 ? frame.current = requestAnimationFrame(i) : (animating.current = false, n());
    };
    frame.current = requestAnimationFrame(i);
  }), []);
  useEffect(() => {
    if (!idle) return;
    let e,
      t = () => {
        !reducedMotion.current && !animating.current && (setPart("eyesOpen", "opacity", 0), setPart("eyesClosed", "opacity", 1), window.setTimeout(() => {
          animating.current || (setPart("eyesOpen", "opacity", 1), setPart("eyesClosed", "opacity", 0));
        }, 140)), e = window.setTimeout(t, 2600 + Math.random() * 3200);
      };
    return e = window.setTimeout(t, 1800 + Math.random() * 2e3), () => window.clearTimeout(e);
  }, [idle]);
  let handForAngle = useCallback(e => {
      let t = 43 * stateRef.current.scale;
      return {
        x: MOUTH_POINT.x - t * Math.sin(toRad(e)),
        y: MOUTH_POINT.y + t * Math.cos(toRad(e))
      };
    }, []),
    drink = useCallback(async (e, t, n) => {
      let r = async () => {
        if (!stateRef.current.holdBottle) return;
        if (reducedMotion.current) {
          n?.onSip?.();
          return;
        }
        let r = clamp01(1 - e / Math.max(t, e)),
          i = 1700 + Math.min(e, 1e3) * 2,
          a = false;
        await animate(i, e => {
          let t = easeOutCubic(segment(e, 0, 0.24)),
            i = easeInCubic(segment(e, 0.84, 1)),
            o = t * (1 - i),
            s = (t * SIP_START_ANGLE + easeInOutCubic(segment(e, 0.3, 0.8)) * (SIP_END_ANGLE - SIP_START_ANGLE)) * (1 - i),
            c = handForAngle(s),
            l = HAND_HOLD,
            u = lerp(l.x, c.x, o),
            d = lerp(l.y, c.y, o),
            f = segment(e, 0.3, 0.82),
            p = lerp(1, r, easeInOutCubic(f)),
            m = easeInOutCubic(segment(e, 0.2, 0.32)) * (1 - easeInOutCubic(segment(e, 0.84, 0.92))),
            h = easeInOutCubic(segment(e, 0.28, 0.5)) * (1 - easeInOutCubic(segment(e, 0.8, 0.95))),
            g = f > 0 && f < 1 ? f * 3 % 1 : 0,
            _ = g > 0.05 && g < 0.55 ? segment(g, 0.05, 0.55) : 0,
            v = easeOutCubic(segment(e, 0.86, 0.95)) * (1 - segment(e, 0.97, 1));
          !a && e > 0.3 && (a = true, n?.onSip?.()), applyPose({
            hx: u,
            hy: d,
            phi: s,
            fill: p,
            closed: m,
            head: h,
            gulp: _,
            spark: v,
            hop: 0
          });
        }), resetPose();
      };
      return queue.current = queue.current.then(r, r), queue.current;
    }, [applyPose, handForAngle, resetPose, animate]),
    cheer = useCallback(async () => {
      let e = async () => {
        if (reducedMotion.current) return;
        let e = stateRef.current.holdBottle ? HAND_HOLD : HAND_REST;
        await animate(900, t => {
          let n = Math.abs(Math.sin(t * Math.PI * 2)) * 10 * (1 - t),
            r = Math.sin(t * Math.PI);
          applyPose({
            hx: e.x,
            hy: e.y - Math.sin(t * Math.PI) * 30,
            phi: 0,
            fill: 1,
            closed: 0,
            head: 0,
            gulp: 0,
            spark: r,
            hop: n
          });
        }), resetPose();
      };
      return queue.current = queue.current.then(e, e), queue.current;
    }, [applyPose, resetPose, animate]);
  return useImperativeHandle(ref, () => ({
    drink,
    cheer
  }), [drink, cheer]), <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} width={size} height={size * box.h / box.w} className={className} role="img" aria-label={label}><defs><clipPath id={`${uid}-bottle`}><path d={BOTTLE_PATH} /></clipPath></defs><g className={idle ? "avatar-bob" : undefined}><g ref={partRef("body")}><HoodieCollarBack clothes={items.kleidung} shirt={cfg.shirt} /><HairBack c={cfg} />{items.kleidung ? <Clothes clothes={items.kleidung} shirt={cfg.shirt} skin={cfg.skin} /> : <path d={DEFAULT_SHIRT_PATH} fill={cfg.shirt} />}<path d="M44 190 C30 204 24 228 26 250 L56 250 C54 228 56 208 62 194 Z" fill={clothes.leftSleeve} />{!items.kleidung && <path d="M104 196 L92 212 L100 212 L96 226 L110 208 L102 208 Z" fill="#fff" opacity="0.85" />}<rect x="87" y="136" width="26" height="46" rx="10" fill={skinShade} /><path d="M84 178 Q100 198 116 178 Q100 184 84 178 Z" fill={skinShade} /><Neckwear item={items.hals} /><Pet item={items.tier} /><g ref={partRef("head")}><circle cx="53" cy="98" r="9" fill={cfg.skin} /><circle cx="147" cy="98" r="9" fill={cfg.skin} /><FaceShape shape={cfg.face} fill={cfg.skin} /><ellipse cx="72" cy="113" rx="9" ry="5.5" fill="#ff7a8a" opacity="0.18" /><ellipse cx="128" cy="113" rx="9" ry="5.5" fill="#ff7a8a" opacity="0.18" /><path d="M98 104 Q95 112 100 114" fill="none" stroke={skinShade} strokeWidth="2.6" strokeLinecap="round" /><Beard style={cfg.beard} color={cfg.hairColor} skin={cfg.skin} /><g ref={partRef("mouth")}><Mouth style={cfg.mouth} /></g><g ref={partRef("eyesOpen")}><Eyes style={cfg.eyes} closed={false} /></g><g ref={partRef("eyesClosed")} opacity="0"><Eyes style={cfg.eyes} closed /></g><Brows style={cfg.brows} color={cfg.hairStyle === "bald" ? shade(cfg.skin, 0.4) : cfg.hairColor} /><HairFront c={cfg} /><Glasses item={items.brille} /><Headwear item={items.kopf} /></g><circle ref={partRef("gulp")} cx="100" cy="156" r="3" fill={shade(cfg.skin, 0.28)} opacity="0" /><g ref={partRef("sparks")} opacity="0">{[[44, 56, 1], [158, 48, 1.15], [30, 100, 0.8]].map(([e, t, n], r) => <path transform={`translate(${e} ${t}) scale(${n})`} d="M0 -9 C4 -3 7 0 0 7 C-7 0 -4 -3 0 -9 Z" fill="#74b2fb" key={r} />)}</g><line ref={partRef("upper")} x1="156" y1="186" x2="175" y2="214" stroke={sleeveColor} strokeWidth="21" strokeLinecap="round" /><line ref={partRef("fore")} x1="175" y1="214" x2="140" y2="208" stroke={foreColor} strokeWidth={foreColor === cfg.skin ? 14 : 19} strokeLinecap="round" /><g ref={partRef("bottle")} transform={`translate(${HAND_HOLD.x} ${HAND_HOLD.y}) scale(${scale})`}><path d={BOTTLE_PATH} fill="#dcecf6" fillOpacity="0.55" /><g clipPath={`url(#${uid}-bottle)`}><g ref={partRef("waterRot")}><rect ref={partRef("water")} x="-60" y="-60" width="120" height="140" fill="#3b9bf0" fillOpacity="0.88" /></g><rect x="-12" y="-6" width="24" height="9" fill="#fff" fillOpacity="0.2" /></g><path d={BOTTLE_PATH} fill="none" stroke="#9ec4dd" strokeWidth="1.8" strokeLinejoin="round" /><rect x="-6.5" y="-44" width="13" height="8" rx="2.5" fill="#075640" /><path d="M-8 -20 L-8 14" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" /></g><circle ref={partRef("hand")} cx={HAND_HOLD.x} cy={HAND_HOLD.y} r="9" fill={cfg.skin} /></g></g></svg>;
});
