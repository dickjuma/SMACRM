import PropTypes from "prop-types";

const TableOne = ({ columns, data, actions }) => {
  return (
    <div className="overflow-x-auto border rounded shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-2 text-left text-sm font-medium text-gray-700"
              >
                {col.label}
              </th>
            ))}
            {actions && actions.length > 0 && (
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (actions ? 1 : 0)}
                className="px-4 py-2 text-center text-gray-500"
              >
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2 text-sm text-gray-700">
                    {row[col.key]}
                  </td>
                ))}
                {actions && actions.length > 0 && (
                  <td className="px-4 py-2 flex gap-2">
                    {actions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => action.onClick(row)}
                        className={`px-2 py-1 text-sm rounded ${action.className}`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

TableOne.propTypes = {
  columns: PropTypes.array.isRequired,
  data: PropTypes.array.isRequired,
  actions: PropTypes.array,
};

export default TableOne;
