// import React from "react";
// import { Link } from "react-router-dom";

// const StatCard = ({
//   to,
//   icon,
//   label,
//   value,
//   color = "#2377FC",
//   loading = false,
// }) => {
//   const card = (
//     <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 h-full">
//       <span
//         className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
//         style={{ background: `${color}1A`, color }}
//       >
//         {icon}
//       </span>
//       <div className="min-w-0">
//         <div className="text-[13px] text-gray-400 font-medium truncate">
//           {label}
//         </div>
//         {loading ? (
//           <div className="h-7 w-14 bg-gray-100 rounded animate-pulse mt-1" />
//         ) : (
//           <div className="text-2xl font-bold text-gray-800 leading-tight">
//             {value}
//           </div>
//         )}
//       </div>
//     </div>
//   );

//   if (!to) return card;

//   return (
//     <Link to={to} style={{ textDecoration: "none" }} className="block h-full">
//       {card}
//     </Link>
//   );
// };

// export default StatCard;

import React from "react";
import { Link } from "react-router-dom";

const StatCard = ({ to, icon, label, value, color = "#2377FC", loading = false }) => {
  const card = (
    <div
      className="relative overflow-hidden flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 h-full"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <span
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}1A`, color }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] text-gray-400 font-medium truncate">
          {label}
        </div>
        {loading ? (
          <div className="h-7 w-20 bg-gray-100 rounded animate-pulse mt-1" />
        ) : (
          <div className="text-xl font-bold text-gray-800 leading-tight mt-0.5">
            {value}
          </div>
        )}
      </div>
    </div>
  );

  if (!to) return card;

  return (
    <Link to={to} style={{ textDecoration: "none" }} className="block h-full">
      {card}
    </Link>
  );
};

export default StatCard;
