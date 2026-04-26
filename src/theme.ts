import { createTheme, type MantineColorsTuple } from "@mantine/core";

const brand: MantineColorsTuple = [
  "#ecefff",
  "#d5dafb",
  "#a9b1f1",
  "#7a87e9",
  "#5362e1",
  "#3a4bdd",
  "#2c40dc",
  "#1f32c4",
  "#182cb0",
  "#0a259c",
];

export const theme = createTheme({
  colors: {
    brand,
  },
  primaryColor: "brand",
  defaultRadius: "md",
  fontFamily:
    "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  headings: {
    fontFamily:
      "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontWeight: "600",
  },
});
