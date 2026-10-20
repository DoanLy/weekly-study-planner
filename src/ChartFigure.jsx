// Hình minh hoạ biểu đồ (Line / Bar / Pie) vẽ bằng SVG thuần, dữ liệu lấy từ
// khối ```chart (JSON) trong writing-task1.md. Không dùng thư viện biểu đồ.
//
// Cú pháp JSON:
//   { "type": "line" | "bar", "unit": "...", "labels": [...], "series": [{ "name", "values" }] }
//   { "type": "pie", "pies": [{ "label": "2020", "slices": [{ "name", "value" }] }] }
//   { "type": "gallery", "items": [{ "title", "note", "chart": { ...một trong các dạng trên } }] }

const COLORS = ['#2F978F', '#E9655C', '#E7B31C', '#4589A1', '#A5DED8', '#A1B6B8'];
const INK = '#1B2E31';
const GRID = '#E2EAEA';
const MUTED = '#72898C';

function niceMax(max) {
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough);
  return { top: Math.ceil(max / step) * step, step };
}

function formatTick(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function Legend({ items, small = false }) {
  return (
    <div className={`flex flex-wrap justify-center gap-x-3 gap-y-1 ${small ? 'text-[10px]' : 'text-[12px]'} font-bold text-ink-700`}>
      {items.map((item, index) => (
        <span key={item.name} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm border border-ink-800/40"
            style={{ background: COLORS[index % COLORS.length] }}
          />
          {item.name}
          {item.suffix && <span className="font-semibold text-ink-400">{item.suffix}</span>}
        </span>
      ))}
    </div>
  );
}

function AxisChart({ spec, mini }) {
  const width = mini ? 220 : 560;
  const height = mini ? 130 : 280;
  const pad = mini
    ? { left: 8, right: 8, top: 10, bottom: 10 }
    : { left: 44, right: 16, top: 14, bottom: 30 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...spec.series.flatMap((s) => s.values));
  const { top, step } = niceMax(max);
  const y = (value) => pad.top + plotH - (value / top) * plotH;
  const count = spec.labels.length;
  const ticks = [];
  for (let value = 0; value <= top + 1e-9; value += step) ticks.push(value);

  // Line: điểm nằm đều trên trục x. Bar: mỗi nhãn là 1 nhóm cột.
  const slot = plotW / count;
  const xCenter = (index) =>
    spec.type === 'line' && count > 1
      ? pad.left + (index / (count - 1)) * plotW
      : pad.left + slot * (index + 0.5);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img">
      {ticks.map((value) => (
        <g key={value}>
          <line x1={pad.left} x2={width - pad.right} y1={y(value)} y2={y(value)} stroke={GRID} strokeWidth="1" />
          {!mini && (
            <text x={pad.left - 6} y={y(value) + 4} textAnchor="end" fontSize="11" fill={MUTED}>
              {formatTick(value)}
            </text>
          )}
        </g>
      ))}
      <line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke={INK} strokeWidth="1.5" />

      {spec.type === 'bar' &&
        spec.series.map((series, seriesIndex) => {
          const groupW = slot * 0.72;
          const barW = groupW / spec.series.length;
          return series.values.map((value, index) => (
            <rect
              key={`${series.name}-${index}`}
              x={pad.left + slot * index + (slot - groupW) / 2 + barW * seriesIndex}
              y={y(value)}
              width={Math.max(barW - (mini ? 1 : 2), 1)}
              height={y(0) - y(value)}
              rx={mini ? 1 : 2}
              fill={COLORS[seriesIndex % COLORS.length]}
              stroke={INK}
              strokeWidth={mini ? 0.5 : 1}
            >
              <title>{`${series.name} · ${spec.labels[index]}: ${value}${spec.unit ? ` ${spec.unit}` : ''}`}</title>
            </rect>
          ));
        })}

      {spec.type === 'line' &&
        spec.series.map((series, seriesIndex) => {
          const color = COLORS[seriesIndex % COLORS.length];
          return (
            <g key={series.name}>
              <polyline
                points={series.values.map((value, index) => `${xCenter(index)},${y(value)}`).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth={mini ? 2 : 2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {series.values.map((value, index) => (
                <circle
                  key={index}
                  cx={xCenter(index)}
                  cy={y(value)}
                  r={mini ? 2.2 : 3.5}
                  fill="#fff"
                  stroke={color}
                  strokeWidth="2"
                >
                  <title>{`${series.name} · ${spec.labels[index]}: ${value}${spec.unit ? ` ${spec.unit}` : ''}`}</title>
                </circle>
              ))}
            </g>
          );
        })}

      {!mini &&
        spec.labels.map((label, index) => (
          <text key={label} x={xCenter(index)} y={height - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill={INK}>
            {label}
          </text>
        ))}
    </svg>
  );
}

function arcPath(cx, cy, r, start, end) {
  const point = (angle) => [cx + r * Math.sin(angle), cy - r * Math.cos(angle)];
  const [x1, y1] = point(start);
  const [x2, y2] = point(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

function Pie({ pie, names, mini }) {
  const size = mini ? 120 : 200;
  const r = size / 2 - 4;
  const c = size / 2;
  const total = pie.slices.reduce((sum, slice) => sum + slice.value, 0);
  let angle = 0;
  return (
    <figure className="flex min-w-0 flex-col items-center gap-1">
      {pie.label && <figcaption className={`font-display font-bold text-ink-900 ${mini ? 'text-[11px]' : 'text-sm'}`}>{pie.label}</figcaption>}
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full" style={{ maxWidth: size }} role="img">
        {pie.slices.map((slice) => {
          const start = angle;
          const end = angle + (slice.value / total) * Math.PI * 2;
          angle = end;
          const mid = (start + end) / 2;
          const color = COLORS[names.indexOf(slice.name) % COLORS.length];
          return (
            <g key={slice.name}>
              <path d={arcPath(c, c, r, start, end)} fill={color} stroke={INK} strokeWidth={mini ? 0.8 : 1.5}>
                <title>{`${slice.name}: ${slice.value}%`}</title>
              </path>
              {!mini && slice.value / total >= 0.08 && (
                <text
                  x={c + r * 0.62 * Math.sin(mid)}
                  y={c - r * 0.62 * Math.cos(mid) + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="800"
                  fill={INK}
                >
                  {slice.value}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function PieChart({ spec, mini }) {
  const names = [...new Set(spec.pies.flatMap((pie) => pie.slices.map((slice) => slice.name)))];
  return (
    <div className={`grid gap-3 ${spec.pies.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {spec.pies.map((pie, index) => (
        <Pie key={pie.label || index} pie={pie} names={names} mini={mini} />
      ))}
    </div>
  );
}

function Chart({ spec, mini = false }) {
  const legend =
    spec.type === 'pie'
      ? [...new Set(spec.pies.flatMap((pie) => pie.slices.map((slice) => slice.name)))].map((name) => ({ name }))
      : spec.series.map((series) => ({ name: series.name }));
  return (
    <div className="flex flex-col gap-2">
      {spec.type === 'pie' ? <PieChart spec={spec} mini={mini} /> : <AxisChart spec={spec} mini={mini} />}
      {!mini && <Legend items={legend} />}
    </div>
  );
}

export default function ChartFigure({ spec }) {
  if (spec.type === 'gallery') {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-5">
        {spec.items.map((item) => (
          <figure
            key={item.title}
            className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-ink-800 bg-white p-3"
          >
            <div className="flex flex-1 items-center justify-center">
              <div className="w-full max-w-[220px]">
                <Chart spec={item.chart} mini />
              </div>
            </div>
            <figcaption className="text-center">
              <p className="font-display text-sm font-bold leading-tight text-ink-900">{item.title}</p>
              {item.note && <p className="text-[11px] font-semibold text-ink-400">{item.note}</p>}
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }

  return (
    <figure className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-ink-800 bg-white p-4">
      {spec.title && (
        <figcaption className="text-center font-display text-sm font-bold text-ink-900">
          {spec.title}
          {spec.unit && <span className="ml-1 font-sans text-[11px] font-semibold text-ink-400">({spec.unit})</span>}
        </figcaption>
      )}
      <div className={spec.type === 'pie' && spec.pies.length === 1 ? 'mx-auto w-full max-w-[260px]' : 'mx-auto w-full max-w-[620px]'}>
        <Chart spec={spec} />
      </div>
    </figure>
  );
}
