import { ReactNode } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  onSearch?: (query: string) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  actions?: (item: T) => ReactNode;
}

export default function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  searchable = false,
  onSearch,
  pagination,
  actions,
}: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E6E6E6] overflow-hidden">
      {searchable && (
        <div className="p-4 border-b border-[#E6E6E6]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher..."
              onChange={(e) => onSearch?.(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#F6F7F9] border-b border-[#E6E6E6]">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wide"
                >
                  {column.label}
                </th>
              ))}
              {actions && <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs font-bold text-[#6B7280] uppercase tracking-wide">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#E6E6E6]">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6C00]"></div>
                  <p className="mt-2 text-[#6B7280]">Chargement...</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-[#6B7280]">
                  Aucune donnée disponible
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="hover:bg-[#F6F7F9] transition-colors">
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-[#1A1A1A]">
                      {column.render ? column.render(item) : String(item[column.key as keyof T] || '')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                      {actions(item)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-[#E6E6E6] flex items-center justify-between">
          <div className="text-sm text-[#3A3A3A]">
            Page {pagination.currentPage} sur {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="p-2 border border-[#D1D5DB] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F6F7F9]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="p-2 border border-[#D1D5DB] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F6F7F9]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

