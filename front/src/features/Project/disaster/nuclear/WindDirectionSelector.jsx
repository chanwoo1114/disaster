import React from 'react';
import { SectionSubTitle } from "../../../../components/common/SectionSubTitle.jsx";

/**
 * 풍향 선택 및 PAZ/UPZ 시각화 컴포넌트
 */
export default function WindDirectionSelector({ value, onChange, windSpeed, pazRadius, upzRadius }) {
  const directions = [
    { value: 1, label: '북풍', shortLabel: '북', angle: 0 },
    { value: 2, label: '북북동풍', shortLabel: '북북동', angle: 22.5 },
    { value: 3, label: '북동풍', shortLabel: '북동', angle: 45 },
    { value: 4, label: '동북동풍', shortLabel: '동북동', angle: 67.5 },
    { value: 5, label: '동풍', shortLabel: '동', angle: 90 },
    { value: 6, label: '동남동풍', shortLabel: '동남동', angle: 112.5 },
    { value: 7, label: '남동풍', shortLabel: '남동', angle: 135 },
    { value: 8, label: '남남동풍', shortLabel: '남남동', angle: 157.5 },
    { value: 9, label: '남풍', shortLabel: '남', angle: 180 },
    { value: 10, label: '남남서풍', shortLabel: '남남서', angle: 202.5 },
    { value: 11, label: '남서풍', shortLabel: '남서', angle: 225 },
    { value: 12, label: '서남서풍', shortLabel: '서남서', angle: 247.5 },
    { value: 13, label: '서풍', shortLabel: '서', angle: 270 },
    { value: 14, label: '서북서풍', shortLabel: '서북서', angle: 292.5 },
    { value: 15, label: '북서풍', shortLabel: '북서', angle: 315 },
    { value: 16, label: '북북서풍', shortLabel: '북북서', angle: 337.5 }
  ];

  return (
    <div className="flex flex-col gap-3 h-auto">
      <SectionSubTitle>
        풍향 선택 (1~16)
      </SectionSubTitle>
      <div className="flex gap-4 flex-wrap sm:flex-nowrap">
        <div className="flex-1 min-w-[300px]">
          <WindDirectionGrid
            directions={directions}
            value={value}
            onChange={onChange}
          />
        </div>

        <div className="flex-shrink-0">
          <WindDirectionVisualization
            directions={directions}
            value={value}
            windSpeed={windSpeed}
            pazRadius={pazRadius}
            upzRadius={upzRadius}
          />
        </div>
      </div>
    </div>
  );
}

function WindDirectionGrid({ directions, value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {directions.map((dir) => {
        const isSelected = value === dir.value;

        return (
          <button
            key={dir.value}
            type="button"
            onClick={() => onChange(dir.value)}
            className={`px-2 py-2 rounded text-sm font-medium transition-all border ${
              isSelected
                ? 'bg-blue-500 text-white border-blue-600 shadow-md'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div className="text-xs opacity-80">{dir.value}</div>
            <div className="text-xs font-bold">{dir.shortLabel}</div>
          </button>
        );
      })}
    </div>
  );
}

function WindDirectionVisualization({ directions, value, windSpeed, pazRadius, upzRadius }) {
  const inputPaz = parseFloat(pazRadius) || 0;
  const inputUpz = parseFloat(upzRadius) || 30;
  const rawSpeed = parseFloat(windSpeed) || 0;

  // ⭐ [핵심 수정] 입력된 풍속(rawSpeed)이 UPZ(inputUpz)를 넘지 못하도록 값 자체를 제한(Limiting)
  // 이후 모든 로직은 이 limitedSpeed를 기준으로 계산됩니다.
  const limitedSpeed = Math.min(rawSpeed, inputUpz);

  // SVG 픽셀 상수
  const SVG_PAZ_RADIUS = 15;
  const SVG_UPZ_RADIUS = 60;

  // 조건: "제한된 풍속"이 PAZ보다 커야 확산 범위 표시
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

    // PAZ >= UPZ 인 예외 상황 처리
    if (range <= 0) return SVG_UPZ_RADIUS;

    // 비율 계산: (제한된풍속 - PAZ) / (UPZ - PAZ)
    // limitedSpeed가 이미 UPZ로 제한되어 있으므로, ratio는 절대 1.0을 넘을 수 없습니다.
    const ratio = (limitedSpeed - inputPaz) / range;

    // 픽셀 변환
    return SVG_PAZ_RADIUS + (SVG_UPZ_RADIUS - SVG_PAZ_RADIUS) * ratio;
  };

  const affectedSectors = shouldShowWind ? getOppositeWindSectors(value) : [];
  const windRadius = calculateWindRadius();

  return (
    <div className="relative w-48 h-48 bg-white rounded-lg border border-gray-300 p-1 flex items-center justify-center shadow-sm">
      <svg width="180" height="180" viewBox="0 0 200 200">
        {/* 배경 원들 */}
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
