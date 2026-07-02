import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText } from "lucide-react";

/**
 * A smart data renderer that displays values based on their type.
 * - Renders arrays of URLs as attachment links.
 * - Renders arrays of objects as a dynamic table.
 * - Renders simple objects as a key-value grid.
 * - Renders strings that are URLs as a single attachment link.
 * - Defaults to rendering the value as a string.
 * @param {any} val - The value to render.
 * @returns {React.ReactNode} The rendered React element.
 */
export const renderValue = (val: any): React.ReactNode => {
  if (val === null || val === undefined || val === "") return "—";

  if (Array.isArray(val)) {
    if (val.length === 0) return "—";
    if (typeof val[0] === 'string' && val[0].startsWith('http')) {
      return (
        <div className="flex flex-col gap-2 mt-1">
          {val.map((url, idx) => (
            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-primary font-bold hover:underline inline-flex items-center gap-1.5 w-fit">
              <FileText className="h-4 w-4" /> View Attachment {idx + 1}
            </a>
          ))}
        </div>
      );
    }
    if (typeof val[0] === 'object' && val[0] !== null) {
      const validRows = val.filter(row => row && typeof row === 'object' && Object.values(row).some(v => v !== "" && v !== null));
      if (validRows.length === 0) return "—";

      let keys = Object.keys(validRows[0]).filter(k => k !== 'avatar');

      if (keys.includes('description') && keys.includes('receiptNo') && keys.includes('amount')) {
        keys = ['description', 'receiptNo', 'amount'];
      }

      return (
        <div className="mt-3 w-full border border-border rounded-lg overflow-x-auto print:border-gray-400">
          <Table className="w-full text-left border-collapse">
            <TableHeader className="bg-muted/50 print:bg-gray-100">
              <TableRow>
                {keys.map(k => (
                  <TableHead key={k} className="text-[10px] sm:text-xs uppercase font-bold p-2 sm:p-3 text-muted-foreground print:text-gray-600 whitespace-nowrap">
                    {k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {validRows.map((row, i) => (
                <TableRow key={i} className="border-b border-border print:border-gray-300 last:border-0 hover:bg-muted/20">
                  {keys.map((k, j) => (
                    <TableCell key={j} className="text-xs sm:text-sm p-2 sm:p-3 whitespace-nowrap print:text-black">
                      {row[k] !== undefined && row[k] !== null && row[k] !== "" ? String(row[k]) : "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }
    return val.join(", ");
  }

  if (typeof val === 'string' && val.startsWith('http')) {
    return (
      <a href={val} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-primary font-bold hover:underline inline-flex items-center gap-1.5">
         <FileText className="h-4 w-4" /> View Attachment
      </a>
    );
  }

  return String(val);
};