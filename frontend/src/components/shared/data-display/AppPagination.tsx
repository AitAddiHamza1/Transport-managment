import { TablePagination } from '@mui/material';

export interface AppPaginationProps {
  /**
   * One-based current page index.
   */
  page: number;
  /**
   * Number of items displayed per page.
   */
  pageSize: number;
  /**
   * Total number of records.
   */
  totalCount: number;
  /**
   * Callback fired when page index shifts. Returns one-based index.
   */
  onPageChange: (page: number) => void;
  /**
   * Callback fired when page size shifts.
   */
  onPageSizeChange?: (pageSize: number) => void;
  rowsPerPageOptions?: number[];
}

export function AppPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  rowsPerPageOptions = [5, 10, 25, 50],
}: AppPaginationProps) {
  const handleChangePage = (
    _event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ) => {
    // MUI TablePagination is zero-based. We convert it back to one-based.
    onPageChange(newPage + 1);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newSize = parseInt(event.target.value, 10);
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    }
  };

  // Convert 1-based index (prop) to 0-based index for MUI internally
  const muiPage = Math.max(0, page - 1);

  return (
    <TablePagination
      component="div"
      count={totalCount}
      page={muiPage}
      onPageChange={handleChangePage}
      rowsPerPage={pageSize}
      onRowsPerPageChange={handleChangeRowsPerPage}
      rowsPerPageOptions={rowsPerPageOptions}
      labelRowsPerPage="Lignes par page :"
      // Accessible translation of page descriptions
      labelDisplayedRows={({ from, to, count }) =>
        `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
      }
    />
  );
}
