export default function WindDirectionVisualization({ directions, value, windSpeed, pazRadius, upzRadius }) {
  const inputPaz = parseFloat(pazRadius) || 0;
  const inputUpz = parseFloat(upzRadius) || 30;
  const rawSpeed = parseFloat(windSpeed) || 0;

  const limitedSpeed = Math.min(rawSpeed, inputUpz);

  const SVG_PAZ_RADIUS = 15;
  const SVG_UPZ_RADIUS = 60;

  const shouldShowWind = value && limitedSpeed >= inputPaz;

  const getOppositeWindSectors = (selectedValue) => {
    if (!selectedValue) return [];
    const oppositeCenter = ((selectedValue - 1 + 8) % 16) + 1;
    const sector1 = ((oppositeCenter - 2 + 16) % 16) + 1;
    const sector2 = oppositeCenter;
    const sector3 = (oppositeCenter % 16) + 1;
    return [sector1, sector2, sector3];
  };

  const calculateWindRadius = () => {
    const range = inputUpz - inputPaz;

    if (range <= 0) return SVG_UPZ_RADIUS;

    const ratio = (limitedSpeed - inputPaz) / range;

    return SVG_PAZ_RADIUS + (SVG_UPZ_RADIUS - SVG_PAZ_RADIUS) * ratio;
  };

  const affectedSectors = shouldShowWind ? getOppositeWindSectors(value) : [];
  const windRadius = calculateWindRadius();

  return (
    <div className="relative w-48 h-48 bg-white rounded-lg border border-gray-300 p-1 flex items-center justify-center shadow-sm">
      <svg width="180" height="180" viewBox="0 0 200 200">

        <circle cx="100" cy="100" r="90" fill="none" stroke="#f3f4f6" strokeWidth="1" />
        <circle cx="100" cy="100" r={SVG_UPZ_RADIUS} fill="none" stroke="#9ca3af" strokeWidth="1" strokeDasharray="4 2" />
        <circle cx="100" cy="100" r={SVG_PAZ_RADIUS} fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="2" fill="#1e40af" />

        <text x="100" y="100" dy="-20" textAnchor="middle" fill="#2563eb" fontSize="9" fontWeight="bold">PAZ</text>
        <text x="100" y="100" dy="-65" textAnchor="middle" fill="#6b7280" fontSize="9">UPZ</text>

        {directions.map((dir) => {
          const isAffected = affectedSectors.includes(dir.value);
          const startAngle = dir.angle - 11.25 - 90;
          const endAngle = dir.angle + 11.25 - 90;

          return (
            <g key={dir.value}>
              {isAffected && shouldShowWind ? (
                <Sector
                  cx={100}
                  cy={100}
                  innerRadius={SVG_PAZ_RADIUS}
                  outerRadius={windRadius}
                  startAngle={startAngle}
                  endAngle={endAngle}
                  fill="#60a5fa"
                  opacity={0.8}
                />
              ) : (
                <Line
                  x1={100}
                  y1={100}
                  innerRadius={SVG_PAZ_RADIUS}
                  angle={dir.angle - 90}
                  length={90}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                />
              )}
              <DirectionLabel
                cx={100}
                cy={100}
                angle={dir.angle - 90}
                radius={96}
                label={dir.value.toString()}
                isSelected={isAffected && shouldShowWind}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Sector({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, opacity }) {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;

  const x1 = cx + outerRadius * Math.cos(startRad);
  const y1 = cy + outerRadius * Math.sin(startRad);
  const x2 = cx + outerRadius * Math.cos(endRad);
  const y2 = cy + outerRadius * Math.sin(endRad);

  const x3 = cx + innerRadius * Math.cos(endRad);
  const y3 = cy + innerRadius * Math.sin(endRad);
  const x4 = cx + innerRadius * Math.cos(startRad);
  const y4 = cy + innerRadius * Math.sin(startRad);

  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  const pathData = innerRadius > 0
    ? `M ${x4},${y4} L ${x1},${y1} A ${outerRadius},${outerRadius} 0 ${largeArcFlag},1 ${x2},${y2} L ${x3},${y3} A ${innerRadius},${innerRadius} 0 ${largeArcFlag},0 ${x4},${y4} Z`
    : `M ${cx},${cy} L ${x1},${y1} A ${outerRadius},${outerRadius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;

  return <path d={pathData} fill={fill} opacity={opacity} />;
}

function Line({ x1, y1, innerRadius = 0, angle, length, stroke, strokeWidth }) {
  const radian = (angle * Math.PI) / 180;
  const startX = x1 + innerRadius * Math.cos(radian);
  const startY = y1 + innerRadius * Math.sin(radian);
  const endX = x1 + length * Math.cos(radian);
  const endY = y1 + length * Math.sin(radian);
  return <line x1={startX} y1={startY} x2={endX} y2={endY} stroke={stroke} strokeWidth={strokeWidth} />;
}

function DirectionLabel({ cx, cy, angle, radius, label, isSelected }) {
  const radian = (angle * Math.PI) / 180;
  const x = cx + radius * Math.cos(radian);
  const y = cy + radius * Math.sin(radian);
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill={isSelected ? '#2563eb' : '#9ca3af'} fontSize="9" fontWeight={isSelected ? 'bold' : 'normal'}>
      {label}
    </text>
  );
}
