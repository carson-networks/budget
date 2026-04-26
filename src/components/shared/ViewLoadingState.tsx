import { Box, Loader } from "@mantine/core";

export function ViewLoadingState() {
  return (
    <Box
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Loader color="brand" />
    </Box>
  );
}
