import React from "react";
import GanttChart from "./components/GanttChart.tsx";
import { Container, Box, Typography, Paper } from "@mui/material";

function App() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          mb: 4,
          textAlign: "center",
          p: 3,
          borderRadius: 3,
          background: "linear-gradient(135deg, #1976d2, #42a5f5)",
          color: "white",
          boxShadow: 3,
        }}
      >
        <Typography variant="h3" fontWeight="bold">
          CSA Project Gantt Chart
        </Typography>
        <Typography variant="subtitle1" sx={{ mt: 1 }}>
          Track the and timelines visually
        </Typography>
      </Box>

      {/* Chart Section */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderRadius: 3,
          overflow: "hidden",
          minHeight: "600px",
        }}
      >
        <GanttChart />
      </Paper>
    </Container>
  );
}

export default App;
