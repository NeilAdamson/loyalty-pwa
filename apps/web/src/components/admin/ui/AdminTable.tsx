import { ReactNode } from 'react';

interface Column<T> {
    header: string;
    accessor?: keyof T;
    render?: (item: T) => ReactNode;
    width?: string;
}

interface AdminTableProps<T> {
    columns: Column<T>[];
    data: T[];
    isLoading?: boolean;
    emptyMessage?: string;
    onRowClick?: (item: T) => void;
    keyField?: keyof T;
}

function AdminTable<T>({
    columns,
    data,
    isLoading,
    emptyMessage = "No records found.",
    onRowClick,
    keyField
}: AdminTableProps<T>) {

    if (isLoading) {
        return (
            <div className="tableWrap" style={{ padding: '40px', textAlign: 'center' }}>
                <p>Loading data...</p>
            </div>
        );
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="tableWrap" style={{ padding: 0 }}>
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ marginBottom: '16px', color: 'var(--text-tertiary)', opacity: 0.5 }}
                    >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p style={{ fontSize: '15px', fontWeight: 500 }}>{emptyMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tableWrap">
            <table className="table">
                <thead>
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={idx} className="th" style={{ width: col.width }}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIdx) => (
                        <tr
                            // Try common ID fields, or fall back to index if necessary
                            key={
                                (keyField ? String((row as any)[keyField]) : null) ||
                                (row as any).id ||
                                (row as any).member_id ||
                                (row as any).vendor_id ||
                                (row as any).admin_id ||
                                rowIdx
                            }
                            className="tr"
                            onClick={() => onRowClick && onRowClick(row)}
                            style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                        >
                            {columns.map((col, colIdx) => (
                                <td key={colIdx} className="td">
                                    {col.render ? col.render(row) : (col.accessor ? String(row[col.accessor]) : '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default AdminTable;
