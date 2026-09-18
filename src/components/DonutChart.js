import React from "react";

const DonutChart = ({
  data = [],
  size = 150,
  thickness = 20,
  centerLabel = "Total",
  formatValue = (v) => v,
}) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const safeTotal = total || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#F1F3F6"
            strokeWidth={thickness}
          />
          {data.map((d, i) => {
            const frac = d.value / safeTotal;
            const dash = frac * circumference;
            const gap = circumference - dash;
            const circle = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offsetAcc}
                style={{ transition: "stroke-dasharray 700ms ease" }}
              />
            );
            offsetAcc += dash;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xl font-bold text-gray-800">
            {formatValue(total)}
          </div>
          <div className="text-[11px] text-gray-400">{centerLabel}</div>
        </div>
      </div>
      <div className="space-y-2.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: d.color }}
            />
            <span className="text-gray-500">{d.label}</span>
            <span className="font-semibold text-gray-800 ml-auto pl-4">
              {formatValue(d.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;
