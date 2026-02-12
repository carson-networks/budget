import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

export default function AccountsView() {
  return (
    <Container maxWidth={false}>
      <Box sx={{ py: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Accounts
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Account management will be rendered here.
        </Typography>
      </Box>
    </Container>
  );
}
