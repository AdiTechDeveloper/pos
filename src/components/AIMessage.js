
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function AIMessage({ content }) {
  return (
    <div className="min-w-0 max-w-full text-sm leading-7 text-gray-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="my-4 w-full max-w-full overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100 text-gray-700">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="whitespace-nowrap border-b border-gray-200 px-4 py-3 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="whitespace-nowrap border-b border-gray-100 px-4 py-3">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50">
              {children}
            </tr>
          ),
          p: ({ children }) => (
            <p className="mb-3 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5">
              {children}
            </ul>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-950">
              {children}
            </strong>
          ),
        }}
      >
        {content || ""}
      </ReactMarkdown>
    </div>
  );
}

export default AIMessage;
