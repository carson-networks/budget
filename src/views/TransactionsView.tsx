import { useState } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Fab from "@mui/material/Fab";
import Add from "@mui/icons-material/Add";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import { useAllTransactions } from "../hooks/useTransactions";
import CreateTransactionDrawer from "../components/CreateTransactionDrawer";

export default function TransactionsView() {
  const { transactions, isLoading, error } = useAllTransactions();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const columns: GridColDef[] = [
    {
      field: "placeholder",
      headerName: "",
      width: 60,
      sortable: false,
      filterable: false,
      renderCell: () => (
        <Box
          sx={{
            width: 40,
            height: 40,
            backgroundColor: "action.hover",
            borderRadius: 1,
          }}
        />
      ),
    },
    {
      field: "transactionName",
      headerName: "Transaction",
      flex: 1,
      minWidth: 150,
    },
    {
      field: "accountID",
      headerName: "Account",
      flex: 1,
      minWidth: 120,
    },
    {
      field: "categoryID",
      headerName: "Category",
      flex: 1,
      minWidth: 120,
    },
    {
      field: "amount",
      headerName: "Amount",
      flex: 1,
      minWidth: 100,
      valueFormatter: (value: string) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(parseFloat(value)),
    },
  ];

  const rows = transactions.map((t) => ({
    id: t.id,
    transactionName: t.transactionName,
    accountID: t.accountID,
    categoryID: t.categoryID,
    amount: t.amount,
  }));

  if (isLoading) {
    return (
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ flex: 1, p: 2 }}>
        <Alert severity="error">{error.message}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        disableRowSelectionOnClick
        sx={{ flex: 1, minHeight: 0 }}
      />

      <Fab
        color="primary"
        aria-label="add transaction"
        onClick={() => setDrawerOpen(true)}
        sx={{ position: "fixed", bottom: 24, right: 24 }}
      >
        <Add />
      </Fab>

      <CreateTransactionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </Box>
  );
}
