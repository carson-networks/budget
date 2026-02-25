import { useState } from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Close from "@mui/icons-material/Close";
import { useCreateTransaction, type CreateTransactionInput } from "../hooks/useTransactions";

interface CreateTransactionDrawerProps {
  open: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH = 400;

export default function CreateTransactionDrawer({ open, onClose }: CreateTransactionDrawerProps) {
  const [transactionName, setTransactionName] = useState("");
  const [accountID, setAccountID] = useState("");
  const [categoryID, setCategoryID] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState("");

  const createTransaction = useCreateTransaction();

  const resetForm = () => {
    setTransactionName("");
    setAccountID("");
    setCategoryID("");
    setAmount("");
    setTransactionDate("");
    createTransaction.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const body: CreateTransactionInput = {
      transactionName,
      accountID,
      categoryID,
      amount,
    };

    if (transactionDate) {
      body.transactionDate = new Date(transactionDate).toISOString();
    }

    createTransaction.mutate(body, {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  const isFormValid = transactionName && accountID && categoryID && amount;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
        },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h6">New Transaction</Typography>
          <IconButton onClick={handleClose} edge="end">
            <Close />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {createTransaction.isError && (
            <Alert severity="error">{createTransaction.error.message}</Alert>
          )}

          <TextField
            label="Transaction Name"
            value={transactionName}
            onChange={(e) => setTransactionName(e.target.value)}
            required
            fullWidth
            autoFocus
          />

          <TextField
            label="Account ID"
            value={accountID}
            onChange={(e) => setAccountID(e.target.value)}
            required
            fullWidth
            placeholder="UUID"
            helperText="Enter the account UUID"
          />

          <TextField
            label="Category ID"
            value={categoryID}
            onChange={(e) => setCategoryID(e.target.value)}
            required
            fullWidth
            placeholder="UUID"
            helperText="Enter the category UUID"
          />

          <TextField
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            fullWidth
            placeholder="0.00"
            helperText="Decimal amount (e.g. 12.50)"
          />

          <TextField
            label="Transaction Date"
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            fullWidth
            slotProps={{
              inputLabel: { shrink: true },
            }}
            helperText="Optional, defaults to today"
          />
        </Box>

        <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={!isFormValid || createTransaction.isPending}
            startIcon={createTransaction.isPending ? <CircularProgress size={20} /> : null}
          >
            {createTransaction.isPending ? "Creating..." : "Create Transaction"}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
