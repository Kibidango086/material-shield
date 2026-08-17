import { resolveColors, onColorFor } from '../color';
import type { MaterialScheme } from '../color';
import { measureText } from '../measure';
import { escapeXml, sanitizeText } from '../escape';
import { resolveLogo } from '../icons';

export type BadgeStyle =
  | 'flat'
  | 'flat-square'
  | 'tonal'
  | 'filled'
  | 'outline'
  | 'for-the-badge';

export interface BadgeOptions {
  label?: string;
  message?: string;
  /** 主题种子色（十六进制）。 */
  color?: string;
  style?: BadgeStyle;
  /** simple-icons 风格的 logo slug（见 src/icons.ts）。 */
  logo?: string;
  logoColor?: string;
  /** 覆盖左侧背景色。 */
  labelColor?: string;
  /** 覆盖右侧背景色。 */
  messageColor?: string;
  /** auto（默认，随浏览者深浅色切换）| true/dark | false/light。 */
  dark?: boolean | string;
}

const FONT =
  "Roboto, 'Segoe UI', 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif";

interface StyleSpec {
  height: number;
  fontSize: number;
  pad: number;
  radius: number | 'pill';
  outline: boolean;
}

const STYLES: Record<BadgeStyle, StyleSpec> = {
  flat: { height: 20, fontSize: 11, pad: 8, radius: 'pill', outline: false },
  'flat-square': { height: 20, fontSize: 11, pad: 8, radius: 4, outline: false },
  tonal: { height: 20, fontSize: 11, pad: 8, radius: 'pill', outline: false },
  filled: { height: 20, fontSize: 11, pad: 8, radius: 'pill', outline: false },
  outline: { height: 20, fontSize: 11, pad: 8, radius: 'pill', outline: true },
  'for-the-badge': { height: 28, fontSize: 13, pad: 10, radius: 10, outline: false },
};

type Role = keyof MaterialScheme;

interface StyleColors {
  labelBg: Role | 'none';
  labelFg: Role;
  msgBg: Role | 'none';
  msgFg: Role;
}

function styleColors(style: BadgeStyle): StyleColors {
  switch (style) {
    case 'tonal':
      return {
        labelBg: 'secondaryContainer',
        labelFg: 'onSecondaryContainer',
        msgBg: 'primaryContainer',
        msgFg: 'onPrimaryContainer',
      };
    case 'filled':
      return { labelBg: 'primary', labelFg: 'onPrimary', msgBg: 'primary', msgFg: 'onPrimary' };
    case 'outline':
      return { labelBg: 'none', labelFg: 'onSurfaceVariant', msgBg: 'none', msgFg: 'onSurface' };
    case 'flat':
    case 'flat-square':
    case 'for-the-badge':
    default:
      return {
        labelBg: 'surfaceVariant',
        labelFg: 'onSurfaceVariant',
        msgBg: 'primary',
        msgFg: 'onPrimary',
      };
  }
}

export function renderBadge(opts: BadgeOptions): string {
  const style: BadgeStyle = opts.style ?? 'flat';
  const st = STYLES[style];
  const tc = resolveColors(opts.color, opts.dark);
  const ref = tc.ref;

  const label = sanitizeText(opts.label ?? '') || 'label';
  const message = sanitizeText(opts.message ?? '') || 'message';

  const colors = styleColors(style);

  let labelBg = colors.labelBg === 'none' ? 'none' : ref(colors.labelBg);
  let labelFg = ref(colors.labelFg);
  let msgBg = colors.msgBg === 'none' ? 'none' : ref(colors.msgBg);
  let msgFg = ref(colors.msgFg);

  // 自定义背景色覆盖（文字色用 Material 算法自动推导，为字面量颜色）
  if (opts.labelColor) {
    labelBg = opts.labelColor;
    labelFg = opts.logoColor ?? onColorFor(opts.labelColor);
  }
  if (opts.messageColor) {
    msgBg = opts.messageColor;
    msgFg = onColorFor(opts.messageColor);
  }

  const logoPath = opts.logo ? resolveLogo(opts.logo) : null;
  const logoSize = logoPath ? st.fontSize * 1.05 : 0;
  const logoGap = logoPath ? st.fontSize * 0.5 : 0;

  const labelW = st.pad + (logoPath ? logoSize + logoGap : 0) + measureText(label, st.fontSize) + st.pad;
  const msgW = st.pad + measureText(message, st.fontSize) + st.pad;
  const width = Math.ceil(labelW + msgW);
  const height = st.height;
  const radius = st.radius === 'pill' ? height / 2 : st.radius;

  const title = `${label}: ${message}`;
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">`,
  );
  parts.push(`<title>${escapeXml(title)}</title>`);
  if (tc.css) parts.push(tc.css);
  parts.push(
    `<defs><clipPath id="msc"><rect width="${width}" height="${height}" rx="${radius}"/></clipPath></defs>`,
  );

  if (st.outline) {
    parts.push(
      `<rect width="${width}" height="${height}" rx="${radius}" fill="none" stroke="${ref('outline')}" stroke-width="1.5"/>`,
    );
    parts.push(
      `<line x1="${labelW}" y1="${Math.round(height * 0.3)}" x2="${labelW}" y2="${Math.round(height * 0.7)}" stroke="${ref('outline')}" stroke-width="1"/>`,
    );
  } else {
    parts.push(`<rect width="${width}" height="${height}" rx="${radius}" fill="${msgBg}"/>`);
    if (labelBg !== msgBg && labelBg !== 'none') {
      parts.push(`<g clip-path="url(#msc)"><rect width="${labelW}" height="${height}" fill="${labelBg}"/></g>`);
    }
  }

  const baseline = height / 2;

  if (logoPath) {
    const scale = logoSize / 24;
    const ly = (height - logoSize) / 2;
    const lx = st.pad;
    const logoFill = opts.logoColor ?? labelFg;
    parts.push(
      `<g transform="translate(${lx},${ly}) scale(${scale})"><path d="${logoPath}" fill="${logoFill}"/></g>`,
    );
  }

  const labelTextX = st.pad + (logoPath ? logoSize + logoGap : 0);
  parts.push(
    `<text x="${labelTextX}" y="${baseline}" fill="${labelFg}" font-family="${FONT}" font-size="${st.fontSize}" font-weight="500" dominant-baseline="central">${escapeXml(label)}</text>`,
  );
  parts.push(
    `<text x="${labelW + st.pad}" y="${baseline}" fill="${msgFg}" font-family="${FONT}" font-size="${st.fontSize}" font-weight="600" dominant-baseline="central">${escapeXml(message)}</text>`,
  );

  parts.push('</svg>');
  return parts.join('');
}
