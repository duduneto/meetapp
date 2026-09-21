import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type TableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  headerProps?: ThHTMLAttributes<HTMLTableCellElement>;
  cellProps?: (row: T) => TdHTMLAttributes<HTMLTableCellElement>;
};

type TableProps<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  scrollable?: boolean;
  className?: string;
  tableProps?: HTMLAttributes<HTMLTableElement>;
};

export function Table<T>({
  columns,
  rows,
  getRowKey,
  scrollable: _scrollable = true,
  className,
  tableProps,
}: TableProps<T>) {
  return (
    <ShadcnTable className={className} {...tableProps}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.id} {...column.headerProps}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={getRowKey(row)}>
            {columns.map((column) => (
              <TableCell key={column.id} {...column.cellProps?.(row)}>
                {column.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </ShadcnTable>
  );
}
