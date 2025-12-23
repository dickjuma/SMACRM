import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AddClient = () => {
  const [client, setClient] = useState({ name: "", email: "", phone: "" });
  const navigate = useNavigate();

  const handleChange = e => setClient({ ...client, [e.target.name]: e.target.value });

  const handleSubmit = e => {
    e.preventDefault();
    console.log("Client added:", client);
    navigate("/clients");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Add Client</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <input
          name="name"
          placeholder="Client Name"
          value={client.name}
          onChange={handleChange}
          className="w-full border px-4 py-2 rounded"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={client.email}
          onChange={handleChange}
          className="w-full border px-4 py-2 rounded"
        />
        <input
          name="phone"
          placeholder="Phone"
          value={client.phone}
          onChange={handleChange}
          className="w-full border px-4 py-2 rounded"
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Save Client
        </button>
      </form>
    </div>
  );
};

export default AddClient;
