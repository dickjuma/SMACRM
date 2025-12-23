import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AddQuotation = () => {
  const [quotation, setQuotation] = useState({
    client: "",
    date: new Date().toISOString().slice(0, 10),
    items: [{ description: "", quantity: 1, price: 0, total: 0 }],
    notes: "",
  });
  const navigate = useNavigate();

  const clients = ["ABC Ltd", "XYZ Ltd", "SMA Tech"]; // Replace with dynamic client list

  const handleItemChange = (index, e) => {
    const newItems = [...quotation.items];
    newItems[index][e.target.name] = e.target.value;

    // Auto calculate total per item
    newItems[index].total = newItems[index].quantity * newItems[index].price;

    setQuotation({ ...quotation, items: newItems });
  };

  const addItem = () => {
    setQuotation({
      ...quotation,
      items: [...quotation.items, { description: "", quantity: 1, price: 0, total: 0 }],
    });
  };

  const removeItem = (index) => {
    const newItems = quotation.items.filter((_, i) => i !== index);
    setQuotation({ ...quotation, items: newItems });
  };

  const grandTotal = quotation.items.reduce((acc, item) => acc + Number(item.total), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Quotation:", quotation);
    navigate("/quotations");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Add Quotation</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
        {/* Client & Date */}
        <div className="flex gap-4">
          <select
            value={quotation.client}
            onChange={(e) => setQuotation({ ...quotation, client: e.target.value })}
            className="flex-1 border px-4 py-2 rounded"
            required
          >
            <option value="">Select Client</option>
            {clients.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={quotation.date}
            onChange={(e) => setQuotation({ ...quotation, date: e.target.value })}
            className="border px-4 py-2 rounded"
            required
          />
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">Description</th>
                <th className="px-4 py-2 border">Quantity</th>
                <th className="px-4 py-2 border">Price</th>
                <th className="px-4 py-2 border">Total</th>
                <th className="px-4 py-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item, index) => (
                <tr key={index} className="text-center">
                  <td className="border px-2 py-1">
                    <input
                      type="text"
                      name="description"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, e)}
                      className="w-full border px-2 py-1 rounded"
                      required
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      type="number"
                      name="quantity"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, e)}
                      className="w-full border px-2 py-1 rounded"
                      required
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      type="number"
                      name="price"
                      min="0"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, e)}
                      className="w-full border px-2 py-1 rounded"
                      required
                    />
                  </td>
                  <td className="border px-2 py-1">{item.total}</td>
                  <td className="border px-2 py-1">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={addItem}
          className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
        >
          Add Item
        </button>

        {/* Grand Total */}
        <div className="text-right font-bold text-lg">Grand Total: {grandTotal}</div>

        {/* Notes */}
        <textarea
          value={quotation.notes}
          onChange={(e) => setQuotation({ ...quotation, notes: e.target.value })}
          placeholder="Additional notes or terms..."
          className="w-full border px-4 py-2 rounded"
        />

        <button
          type="submit"
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
        >
          Save Quotation
        </button>
      </form>
    </div>
  );
};

export default AddQuotation;
