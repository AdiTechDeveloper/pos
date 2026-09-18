export default function ExpiryAlertBadge({ total, onClick }) {
  if (total === undefined || total === null) return null;

  return (
    <div
      className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 cursor-pointer transition"
      onClick={onClick}
    >
      <i className="icon-bell text-gray-700 text-5xl"></i>

      {total > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 
      flex items-center justify-center rounded-full 
      bg-red-600 text-white text-[10px] font-semibold leading-none"
        >
          {total}
        </span>
      )}
    </div>
  );
}
