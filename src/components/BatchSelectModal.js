export default function BatchSelectModal({ options, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl w-[720px] shadow-2xl p-6">
        <h2 className="text-3xl font-bold mb-6">Select Batch to Sell</h2>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {options.map((o, i) => (
            <div
              key={i}
              onClick={() => onSelect(o)}
              className="flex justify-between items-center p-4 rounded-xl border cursor-pointer hover:bg-blue-50 transition"
            >
              <div>
                <p className="text-xl font-semibold">Batch: {o.batch_no}</p>
                <p className="text-gray-500">Stock: {o.qty_available}</p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-blue-700">
                  ₹{o.selling_price}
                </p>

                {o.is_opening === 1 && (
                  <span className="text-sm text-green-600 font-bold">
                    Opening Stock
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl bg-gray-200 text-xl hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
