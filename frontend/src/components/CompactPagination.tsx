import React from 'react';
import { Box, Select, MenuItem, IconButton, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

interface CompactPaginationProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  rowsPerPageOptions?: number[];
}

const CompactPagination: React.FC<CompactPaginationProps> = ({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 25, 50, 100]
}) => {
  const totalPages = Math.ceil(count / rowsPerPage);
  const startItem = count === 0 ? 0 : page * rowsPerPage + 1;
  const endItem = Math.min((page + 1) * rowsPerPage, count);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 2,
        py: 0.75,
        px: 1.5,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        minHeight: 40
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
          Itens por página:
        </Typography>
        <Select
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(e as any)}
          size="small"
          sx={{
            fontSize: '0.8125rem',
            height: 28,
            '& .MuiSelect-select': {
              py: 0.25,
              pr: 2.5,
              minHeight: 'auto'
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'divider'
            }
          }}
        >
          {rowsPerPageOptions.map((option) => (
            <MenuItem key={option} value={option} sx={{ fontSize: '0.8125rem', py: 0.5 }}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
        {startItem}–{endItem} de {count}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        <IconButton
          size="small"
          onClick={(e) => onPageChange(e, page - 1)}
          disabled={page === 0}
          sx={{ p: 0.5 }}
        >
          <ChevronLeft fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => onPageChange(e, page + 1)}
          disabled={page >= totalPages - 1}
          sx={{ p: 0.5 }}
        >
          <ChevronRight fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default CompactPagination;
