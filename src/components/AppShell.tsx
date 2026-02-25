import { useState } from "react";
import { Outlet } from "react-router-dom";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import TopBar from "./TopBar";
import NavigationDrawer from "./NavigationDrawer";

export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleMenuToggle = () => setDrawerOpen(true);
  const handleDrawerClose = () => setDrawerOpen(false);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <TopBar onMenuToggle={handleMenuToggle} />
      <NavigationDrawer open={drawerOpen} onClose={handleDrawerClose} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <Toolbar />
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
