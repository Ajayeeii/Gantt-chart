import GanttChart from "./components/GanttChart.tsx";
import { Container, Box, Paper, useTheme, useMediaQuery } from "@mui/material";

function App() {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Container
      maxWidth={isLargeScreen ? false : "xl"}
      disableGutters={isLargeScreen}
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        py: isSmallScreen ? 2 : 4,
        px: isLargeScreen ? 4 : 0,
        width: "100%",
        maxWidth: isLargeScreen ? "none" : "100%",
        overflow: "hidden",   // ✅ prevent outer scrollbars
      }}
    >
      {/* Chart Section */}
      <Paper
        elevation={isSmallScreen ? 1 : 3}
        sx={{
          p: isSmallScreen ? 1 : 2,
          borderRadius: 2,
          flexGrow: 1,
          width: "100%",
          mx: "auto",
          overflow: "hidden",  // ✅ keep chart inside
        }}
      >
        <Box sx={{ height: "100%", overflow: "auto" }}>
          {/* ✅ only this Box scrolls */}
          <GanttChart />
        </Box>
      </Paper>
    </Container>

  );
}

export default App;