import { useNavigate } from "react-router-dom";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ReceiptLong from "@mui/icons-material/ReceiptLong";
import AccountBalance from "@mui/icons-material/AccountBalance";

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function NavigationDrawer({
  open,
  onClose,
}: NavigationDrawerProps) {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <Drawer
      variant="temporary"
      anchor="left"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        "& .MuiDrawer-paper": { boxSizing: "border-box", width: 250 },
      }}
    >
      <List sx={{ pt: 2 }}>
        <ListItemButton onClick={() => handleNavigate("/transactions")}>
          <ListItemIcon>
            <ReceiptLong />
          </ListItemIcon>
          <ListItemText primary="Transactions" />
        </ListItemButton>
        <ListItemButton onClick={() => handleNavigate("/accounts")}>
          <ListItemIcon>
            <AccountBalance />
          </ListItemIcon>
          <ListItemText primary="Accounts" />
        </ListItemButton>
      </List>
    </Drawer>
  );
}
