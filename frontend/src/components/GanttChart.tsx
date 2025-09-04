import React, { useEffect, useState } from "react";
import { Gantt, type Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";

export interface CustomTask extends Task {
  reopen_status?: string | null;
  spIndex?: number;
}

import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Modal,
  Backdrop,
  Fade,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  InputAdornment,
  useTheme,       // ✅ add this
  useMediaQuery,  // ✅ add this
} from "@mui/material";

import CircularProgress from "@mui/material/CircularProgress";
import SearchIcon from "@mui/icons-material/Search";


interface Invoice {
    invoice_number: string;
    service_number: string;
    due_date: string | null;
    payment_status: string;
    amount: number;
    comment: string;
}
interface ReadyToInvoice {
    invoice_number?: string;
    service_date?: string;
    due_date?: string;
    project_status?: string;
    price?: number;
    comments?: string;
}
interface UnpaidInvoice {
    invoice_no: string;
    comments?: string;
    invoice_date?: string;
    booked_date?: string;
    received_date?: string;
    amount?: number;
}

interface BackendTask {
    assign_to: string;
    children: BackendTask[];
    color?: string;
    end: string;
    id: string;
    name: string;
    p_team: string;
    project_details?: string;
    subproject_details?: string;
    project_manager?: string;
    start: string;
    state: string | null;
    urgency?: string;
    parent_name: string | null;
    status?: string;
    invoices?: Invoice[];
    ready_to_invoice?: ReadyToInvoice[];
    unpaid_invoices?: UnpaidInvoice[];
    reopen_status?: string | null;
}

const GanttChart: React.FC = () => {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
    const isExtraSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const topScrollRef = React.useRef<HTMLDivElement>(null);
    const bottomScrollRef = React.useRef<HTMLDivElement>(null);
    const ganttContentRef = React.useRef<HTMLDivElement>(null);
    const [tasks, setTasks] = useState<CustomTask[]>([]);
    const [filteredTasks, setFilteredTasks] = useState<CustomTask[]>([]);
    const [selectedTask, setSelectedTask] = useState<BackendTask | null>(null);
    const [backendTasks, setBackendTasks] = useState<BackendTask[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>((localStorage.getItem("ganttViewMode") as ViewMode) || ViewMode.Month);
    const [filterStart, setFilterStart] = useState<string>(localStorage.getItem("ganttFilterStart") || "");
    const [filterEnd, setFilterEnd] = useState<string>(localStorage.getItem("ganttFilterEnd") || "");
    const [searchTerm, setSearchTerm] = useState<string>(localStorage.getItem("ganttSearchTerm") || "");
    const [loading, setLoading] = useState(false);
    const [pendingSearch, setPendingSearch] = useState("");
    const urgencyLabels: Record<string, string> = {
        red: "Very Urgent",
        navy: "Completed",
        green: "In Progress",
        orange: "Urgent",
        yellow: "On Hold",
        purple: "Closed",
        white: "Waiting",
        gray: "Not started",
    };

    const urgencyColors: Record<string, string> = {
        red: "#ff0000ff",
        navy: "#1A1A55",
        green: "#188918",
        orange: "#FFA500",
        yellow: "#FFFF00",
        purple: "#8B008B",
        white: "#fefdfd",
        gray: "#bfbfbf",
    };
    // Responsive column widths
    const getColWidths = () => {
        if (isExtraSmallScreen) {
            return {
                id: "60px",
                pm: "80px",
                sd: "90px",
                eed: "90px",
            };
        } else if (isSmallScreen) {
            return {
                id: "70px",
                pm: "100px",
                sd: "110px",
                eed: "110px",
            };
        }
        return {
            id: "80px",
            pm: "120px",
            sd: "120px",
            eed: "120px",
        };
    };
    const colWidths = getColWidths();
    // helper to detect near-white colors
    const isNearWhite = (color: string) => {
        const hex = color.replace("#", "").toLowerCase();
        return ["ffffff", "fefefe", "fefdfd"].includes(hex);
    };
    const styleWithBorderFix = (color: string) => {
        if (isNearWhite(color)) {
            return {
                progressColor: color,
                backgroundColor: color,
                border: "2px solid #000000ff", // noticeable border (dark gray)
            };
        }
        return {
            progressColor: color,
            backgroundColor: color,
        };
    };

    const mapOneParent = (item: BackendTask): CustomTask[] => {
        if (!item.start || !item.end) return [];

        let startDate = new Date(item.start);
        let endDate = new Date(item.end);
        if (endDate < startDate) [startDate, endDate] = [endDate, startDate];
        const parentColor = urgencyColors[item.urgency || "gray"] || "#bfbfbf";
        const parent: CustomTask = {
            id: item.id,
            name: item.name,
            start: startDate,
            end: endDate,
            type: "project",
            progress: 0,
            isDisabled: false,
            styles: styleWithBorderFix(parentColor),
            reopen_status: item.reopen_status ?? null,   // ✅ no "as any"
        };

        const children: CustomTask[] = (item.children || [])
            .map((child, index) => {
                if (!child.start || !child.end) return null;

                let cStart = new Date(child.start);
                let cEnd = new Date(child.end);
                if (cEnd < cStart) [cStart, cEnd] = [cEnd, cStart];

                const childColor = urgencyColors[child.urgency || "gray"] || "#bfbfbf";

                const ct: CustomTask = {
                    id: child.id,
                    name: `→ ${child.name}`,
                    start: cStart,
                    end: cEnd,
                    type: "task",
                    project: item.id,
                    progress: 0,
                    isDisabled: false,
                    styles: styleWithBorderFix(childColor),
                    spIndex: index + 1,
                    reopen_status: child.reopen_status ?? null,
                };
                return ct;
            })
            .filter((c): c is CustomTask => c !== null);

        return [parent, ...children];
    };
    const TaskListHeader: React.FC<any> = ({
        headerHeight,
        rowWidth,
        fontFamily,
    }) => {
        const responsiveFontSize = isExtraSmallScreen ? "11px" : "14px";

        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    height: headerHeight,
                    lineHeight: `${headerHeight}px`,
                    width: rowWidth,
                    fontFamily,
                    fontSize: responsiveFontSize,
                    fontWeight: 600,
                    borderBottom: "2px solid #ddd",
                    backgroundColor: "#f5f5f5",
                }}
            >
                <div
                    style={{
                        flex: `0 0 ${colWidths.id}`,
                        borderRight: "1px solid #ddd",
                        padding: "0 4px",
                        textAlign: "center",
                    }}
                >
                    ID
                </div>
                <div
                    style={{
                        flex: `0 0 ${colWidths.pm}`,
                        borderRight: "1px solid #ddd",
                        padding: "0 4px",
                        textAlign: "center",
                    }}
                >
                    PM
                </div>
                <div
                    style={{
                        flex: `0 0 ${colWidths.sd}`,
                        borderRight: "1px solid #ddd",
                        padding: "0 4px",
                        textAlign: "center",
                    }}
                >
                    {isExtraSmallScreen ? "START" : "START DATE"}
                </div>
                <div
                    style={{
                        flex: `0 0 ${colWidths.eed}`,
                        padding: "0 4px",
                        textAlign: "center",
                    }}
                >
                    ECD
                </div>
            </div>
        );
    };
    const TaskListTable: React.FC<any> = ({
        rowWidth,
        fontFamily,
        locale,
        tasks,
    }) => {
        const responsiveFontSize = isExtraSmallScreen ? "11px" : "14px";

        return (
            <div style={{ width: rowWidth, fontFamily, fontSize: responsiveFontSize }}>
                {tasks.map((t: Task) => {
                    const projectId = t.type === "project" ? t.id : t.project || t.id;
                    const parent = backendTasks.find((b) => b.id === projectId);
                    const managerFull = parent?.project_manager || "N/A";
                    const manager = managerFull.split(" ")[0];
                    const startStr =
                        t.start instanceof Date
                            ? isExtraSmallScreen
                                ? t.start.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
                                : t.start.toLocaleDateString(locale)
                            : String(t.start);
                    const endStr =
                        t.end instanceof Date
                            ? isExtraSmallScreen
                                ? t.end.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
                                : t.end.toLocaleDateString(locale)
                            : String(t.end);
                    const isSelected = selectedTaskId === t.id;

                    return (
                        <div
                            key={t.id}
                            onClick={() => setSelectedTaskId(t.id)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                height: ganttDimensions.rowHeight,          // ✅ match Gantt rowHeight
                                lineHeight: `${ganttDimensions.rowHeight}px`,
                                cursor: "pointer",
                                borderBottom: "1px solid #ddd",
                                background: isSelected ? "rgba(0,0,0,0.04)" : undefined,
                                boxSizing: "border-box",                    // ✅ keeps border inside height
                            }}
                        >
                            <div
                                style={{
                                    flex: `0 0 ${colWidths.id}`,
                                    borderRight: "1px solid #ddd",
                                    padding: "0 4px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "left",
                                    gap: "6px",   // space between id and badges
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {t.type === "task" && (t as any).spIndex ? (
                                    <>
                                        <span>{t.project}</span>

                                        {/* 🔹 Subproject badge */}
                                        <span
                                            style={{
                                                backgroundColor: "#ff5722",
                                                color: "#fff",
                                                fontSize: "10px",
                                                fontWeight: "bold",
                                                width: "18px",
                                                height: "18px",
                                                borderRadius: "50%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            S{(t as any).spIndex}
                                        </span>

                                        {/* 🔹 Reopen badge (if exists) */}
                                        {(t as any).reopen_status ? (
                                            <span
                                                style={{
                                                    backgroundColor: "#ff5722",
                                                    color: "#fff",
                                                    fontSize: "10px",
                                                    fontWeight: "bold",
                                                    width: "18px",
                                                    height: "18px",
                                                    borderRadius: "50%",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                {(t as any).reopen_status}
                                            </span>
                                        ) : null}
                                    </>
                                ) : (
                                    <>
                                        <span>{t.id}</span>
                                        {/* 🔹 Reopen badge for normal projects */}
                                        {(t as any).reopen_status ? (
                                            <span
                                                style={{
                                                    backgroundColor: "#ff5722",
                                                    color: "#fff",
                                                    fontSize: "10px",
                                                    fontWeight: "bold",
                                                    width: "18px",
                                                    height: "18px",
                                                    borderRadius: "50%",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                {(t as any).reopen_status}
                                            </span>
                                        ) : null}
                                    </>
                                )}
                            </div>
                            <div
                                style={{
                                    flex: `0 0 ${colWidths.pm}`,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    borderRight: "1px solid #ddd",
                                    padding: "0 4px",
                                    textAlign: "center",
                                }}
                            >
                                {manager}
                            </div>
                            <div
                                style={{
                                    flex: `0 0 ${colWidths.sd}`,
                                    borderRight: "1px solid #ddd",
                                    padding: "0 4px",
                                    textAlign: "center",
                                }}
                            >
                                {startStr}
                            </div>
                            <div
                                style={{
                                    flex: `0 0 ${colWidths.eed}`,
                                    padding: "0 4px",
                                    textAlign: "center",
                                }}
                            >
                                {endStr}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };
    useEffect(() => {
        localStorage.setItem("ganttSearchTerm", searchTerm);
    }, [searchTerm]);
    const clearSearch = () => {
        setSearchTerm("");
        localStorage.removeItem("ganttSearchTerm");
    };
    useEffect(() => {
        const handler = setTimeout(() => {
            setLoading(true);
            setSearchTerm(pendingSearch);   // only update searchTerm after user stops typing
            setLoading(false);
        }, 500); // wait 500ms after typing stops

        return () => clearTimeout(handler); // cleanup old timeout
    }, [pendingSearch]);
    useEffect(() => {
        fetch("http://localhost:5000/gantt-data")
            .then((res) => res.json())
            .then((data: BackendTask[]) => {
                setBackendTasks(data);
                const mapped: Task[] = data.flatMap((item) => mapOneParent(item));
                setTasks(mapped);
                setFilteredTasks(mapped);
            })
            .catch((err) => console.error("Error fetching data:", err));
    }, []);
    useEffect(() => {
        let filtered = [...tasks];

        // Apply search filter
        if (searchTerm) {
            const searchTermLower = searchTerm.toLowerCase();
            filtered = filtered.filter(task => {
                // Convert both IDs to strings and then lowercase for comparison
                const taskIdStr = String(task.id).toLowerCase();
                const projectIdStr = task.project ? String(task.project).toLowerCase() : "";

                // Check if task ID or project ID matches search term
                const matchesTaskId = taskIdStr.includes(searchTermLower);
                const matchesProjectId = projectIdStr.includes(searchTermLower);

                return matchesTaskId || matchesProjectId;
            });
        }

        // Apply custom date filters if provided
        if (filterStart) {
            const startDate = new Date(filterStart);
            filtered = filtered.filter((t) => t.end >= startDate);
        }
        if (filterEnd) {
            const endDate = new Date(filterEnd);
            filtered = filtered.filter((t) => t.start <= endDate);
        }

        setFilteredTasks(filtered);
    }, [searchTerm, filterStart, filterEnd, tasks]);

    useEffect(() => {
        localStorage.setItem("ganttViewMode", viewMode);
    }, [viewMode]);

    useEffect(() => {
        localStorage.setItem("ganttFilterStart", filterStart);
    }, [filterStart]);

    useEffect(() => {
        localStorage.setItem("ganttFilterEnd", filterEnd);
    }, [filterEnd]);

    const handleTaskClick = (task: Task) => {
        let backendTask = backendTasks.find((t) => t.id === task.id) || null;
        if (!backendTask) {
            backendTasks.forEach((parent) => {
                const foundChild = parent.children.find((c: any) => c.id === task.id);
                if (foundChild) {
                    backendTask = {
                        ...foundChild,
                        p_team: foundChild.p_team || parent.p_team,
                        project_manager:
                            foundChild.project_manager || parent.project_manager,
                        parent_name: parent.name,
                    };
                }
            });
        }
        setSelectedTask(backendTask);
    };
    // Calculate responsive Gantt chart dimensions
    const getGanttDimensions = () => {
        if (isExtraSmallScreen) {
            return {
                columnWidth: 60,
                rowHeight: 28,
                listCellWidth: "320px",
                fontSize: "12px"
            };
        } else if (isSmallScreen) {
            return {
                columnWidth: 70,
                rowHeight: 30,
                listCellWidth: "380px",
                fontSize: "13px"
            };
        }
        return {
            columnWidth: 80,
            rowHeight: 32,
            listCellWidth: "440px",
            fontSize: "14px"
        };
    };

    const ganttDimensions = getGanttDimensions();

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Filter / Controls */}
            <Box
                sx={{
                    mb: 2,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: { xs: 1, sm: 2 },
                    alignItems: "center",
                }}
            >
                <Typography
                    variant="h6"
                    sx={{ flexBasis: "100%", fontSize: { xs: '2.1rem', sm: '2.25rem' } }}
                >
                    Project Timeline
                </Typography>

                {loading ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CircularProgress size={24} />
                        <Typography variant="body2">Loading...</Typography>
                    </Box>
                ) : (
                    <>
                        <FormControl
                            sx={{ minWidth: { xs: 120, sm: 140, md: 150 } }}
                            size={isExtraSmallScreen ? "small" : "medium"}
                        >
                            <InputLabel>View Mode</InputLabel>
                            <Select
                                value={viewMode}
                                label="View Mode"
                                onChange={(e) => {
                                    setLoading(true);
                                    setViewMode(e.target.value as ViewMode);
                                    setTimeout(() => setLoading(false), 500); // simulate delay
                                }}
                            >
                                <MenuItem value={ViewMode.Day}>Day</MenuItem>
                                <MenuItem value={ViewMode.Month}>Month</MenuItem>
                                <MenuItem value={ViewMode.Year}>Year</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label="Start Date"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={filterStart}
                            onChange={(e) => {
                                setLoading(true);
                                setFilterStart(e.target.value);
                                setTimeout(() => setLoading(false), 500);
                            }}
                            size={isExtraSmallScreen ? "small" : "medium"}
                            sx={{ width: { xs: 140, sm: 160 } }}
                        />

                        <TextField
                            label="End Date"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={filterEnd}
                            onChange={(e) => {
                                setLoading(true);
                                setFilterEnd(e.target.value);
                                setTimeout(() => setLoading(false), 500);
                            }}
                            size={isExtraSmallScreen ? "small" : "medium"}
                            sx={{ width: { xs: 140, sm: 160 } }}
                        />

                        <TextField
                            placeholder="Search ID"
                            value={pendingSearch}
                            onChange={(e) => setPendingSearch(e.target.value)}
                            size={isExtraSmallScreen ? "small" : "medium"}
                            sx={{
                                width: { xs: 200, sm: 250 },
                                backgroundColor: "#f5f5f5",
                                borderRadius: "20px",
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: "20px",
                                },
                                "& input::placeholder": {
                                    fontSize: "0.9rem",
                                },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {searchTerm && (
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={() => {
                                    setLoading(true);
                                    clearSearch();           // your existing function (resets searchTerm)
                                    setPendingSearch("");    // also clear the input field
                                    setTimeout(() => setLoading(false), 500);
                                }}
                                size={isExtraSmallScreen ? "small" : "medium"}
                            >
                                Clear Search
                            </Button>

                        )}

                        {(filterStart || filterEnd) && !searchTerm && (
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={() => {
                                    setLoading(true);
                                    setFilterStart("");
                                    setFilterEnd("");
                                    localStorage.removeItem("ganttFilterStart");
                                    localStorage.removeItem("ganttFilterEnd");
                                    setTimeout(() => setLoading(false), 500);
                                }}
                                size={isExtraSmallScreen ? "small" : "medium"}
                            >
                                Clear Dates
                            </Button>
                        )}
                    </>
                )}
            </Box>


            {/* Gantt Wrapper */}
            <Box
                sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                    overflow: "hidden",
                    border: "1px solid #e0e0e0",
                    borderRadius: "4px",
                }}
            >
                {/* Main scrollable Gantt area */}
                <Box
                    ref={bottomScrollRef}
                    sx={{
                        flex: 1,
                        overflow: "auto",
                        minHeight: 0,
                        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                        fontSize: ganttDimensions.fontSize
                    }}
                    onScroll={(e) => {
                        if (topScrollRef.current) {
                            topScrollRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
                        }
                    }}
                >
                    <Box
                        ref={ganttContentRef}
                        sx={{
                            lineHeight: "normal",
                        }}
                    >
                        {filteredTasks.length > 0 ? (
                            <Gantt
                                tasks={filteredTasks}  // ✅ This should be the correct prop name
                                viewMode={viewMode}
                                onClick={handleTaskClick}
                                columnWidth={ganttDimensions.columnWidth}
                                rowHeight={ganttDimensions.rowHeight}
                                listCellWidth="220"
                                TaskListHeader={TaskListHeader}
                                TaskListTable={TaskListTable}
                                barFill={60}
                                barCornerRadius={3}
                                barProgressColor="#3366CC"
                                barProgressSelectedColor="#3d7cef"
                                barBackgroundColor="#a5b5d0"
                                barBackgroundSelectedColor="#b8c6e4"
                                fontFamily='"Roboto", "Helvetica", "Arial", sans-serif'
                                fontSize={ganttDimensions.fontSize}
                            />

                        ) : (
                            <Typography sx={{ p: 2 }}>No valid tasks to display...</Typography>
                        )}
                    </Box>
                </Box>
            </Box>

            {/* Modal */}
            <Modal
                open={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                closeAfterTransition
                slots={{ backdrop: Backdrop }}
                slotProps={{ backdrop: { timeout: 500 } }}
            >
                <Fade in={!!selectedTask}>
                    <Box
                        sx={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            bgcolor: "background.paper",
                            borderRadius: 2,
                            boxShadow: 6,
                            p: { xs: 2, sm: 3, md: 4 },
                            width: "95%",
                            maxWidth: { xs: "95%", sm: "90%", md: 700 },
                            maxHeight: "85vh",
                            overflowY: "auto",
                        }}
                    >
                        {/* Header */}
                        <Box
                            sx={{
                                mb: 2,
                                p: { xs: 1, sm: 2 },
                                borderRadius: 2,
                                background: "linear-gradient(135deg, #1976d2, #42a5f5)",
                                color: "white",
                                boxShadow: 2,
                            }}
                        >
                            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' } }}>
                                {selectedTask?.parent_name ? "Subproject Details" : "Project Details"}
                            </Typography>
                            {selectedTask?.parent_name && (
                                <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    Parent Project: <strong>{selectedTask.parent_name}</strong>
                                </Typography>
                            )}
                        </Box>
                        {/* Project Info */}
                        <Box sx={{ mb: 2 }}>
                            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, mb: 1 }}>
                                <strong>Name:</strong> {selectedTask?.name}
                            </Typography>
                            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, mb: 1 }}>
                                <strong>Description:</strong>{" "}
                                {selectedTask?.project_details ||
                                    selectedTask?.subproject_details ||
                                    "N/A"}
                            </Typography>
                            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, mb: 1 }}>
                                <strong>Status:</strong>{" "}
                                {selectedTask?.urgency
                                    ? urgencyLabels[selectedTask.urgency]
                                    : "N/A"}
                            </Typography>
                            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, mb: 1 }}>
                                <strong>Start Date:</strong>{" "}
                                {selectedTask?.start
                                    ? new Date(selectedTask.start).toDateString()
                                    : "N/A"}
                            </Typography>
                            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, mb: 1 }}>
                                <strong>Expected End Date:</strong>{" "}
                                {selectedTask?.end
                                    ? new Date(selectedTask.end).toDateString()
                                    : "N/A"}
                            </Typography>
                            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, mb: 1 }}>
                                <strong>Engineer:</strong> {selectedTask?.assign_to || "N/A"}
                            </Typography>
                            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, mb: 1 }}>
                                <strong>Project Manager:</strong> {selectedTask?.project_manager || "N/A"}
                            </Typography>
                            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, mb: 1 }}>
                                <strong>Team:</strong> {selectedTask?.p_team || "N/A"}
                            </Typography>
                        </Box>

                        {/* Finance Table */}
                        {!selectedTask?.parent_name &&
                            ((selectedTask?.invoices?.length ?? 0) > 0 || (selectedTask?.ready_to_invoice?.length ?? 0) > 0) && (
                                <>
                                    <Typography
                                        variant="subtitle1"
                                        fontWeight="bold"
                                        sx={{ mb: 1, fontSize: { xs: '0.9rem', sm: '1rem' } }}
                                    >
                                        Receivable Details
                                    </Typography>
                                    <Paper elevation={2} sx={{ mb: 2, overflow: 'auto' }}>
                                        <Table size="small">
                                            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                                                <TableRow>
                                                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                        <strong>Invoice</strong>
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                        <strong>Service Date</strong>
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                        <strong>Due Date</strong>
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                        <strong>Status</strong>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                        <strong>Amount</strong>
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                        <strong>Comments</strong>
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {[...(selectedTask?.invoices ?? []), ...(selectedTask?.ready_to_invoice ?? [])]
                                                    .map((inv: any, idx: number) => (
                                                        <TableRow key={idx}>
                                                            <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                                {inv.invoice_number || "N/A"}
                                                            </TableCell>
                                                            <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                                {inv.service_date || "N/A"}
                                                            </TableCell>
                                                            <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                                {inv.due_date
                                                                    ? new Date(inv.due_date).toLocaleDateString()
                                                                    : "N/A"}
                                                            </TableCell>
                                                            <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                                {/* If it has payment_status → invoice, else → ready_to_invoice */}
                                                                {inv.payment_status
                                                                    ? (inv.payment_status.toLowerCase() === "paid"
                                                                        ? "Paid"
                                                                        : inv.payment_status.toLowerCase() === "void"
                                                                            ? "Invoiced"
                                                                            : inv.payment_status)
                                                                    : inv.project_status || "Ready to be Invoiced"}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                                {inv.amount
                                                                    ? `$${inv.amount}`
                                                                    : inv.price
                                                                        ? `$${inv.price}`
                                                                        : "N/A"}
                                                            </TableCell>
                                                            <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                                {inv.comments || "N/A"}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                    </Paper>
                                </>
                            )}
                        {/* Unpaid Invoices Table */}
                        {!selectedTask?.parent_name &&
                            (selectedTask?.unpaid_invoices?.length ?? 0) > 0 && (
                                <>
                                    <Typography
                                        variant="subtitle1"
                                        fontWeight="bold"
                                        sx={{ mb: 1, fontSize: { xs: '0.9rem', sm: '1rem' } }}
                                    >
                                        Payable Details
                                    </Typography>
                                    <Paper elevation={2} sx={{ mb: 2, overflow: 'auto' }}>
                                        <Table size="small">
                                            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                                                <TableRow>
                                                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                        <strong>Invoice No</strong>
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                        <strong>Invoice Date</strong>
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                        <strong>Booked Date</strong>
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                        <strong>Received Date</strong>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                        <strong>Amount</strong>
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                        <strong>Comments</strong>
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {(selectedTask?.unpaid_invoices ?? []).map((inv: any, idx: number) => (
                                                    <TableRow key={idx}>
                                                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                            {inv.invoice_no || "N/A"}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                            {inv.invoice_date || "N/A"}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                            {inv.booked_date || "N/A"}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                            {inv.received_date || "N/A"}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                            {inv.amount ? `$${inv.amount}` : "N/A"}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                            {inv.comments || "N/A"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Paper>
                                </>
                            )}



                        {/* Actions */}
                        <Box textAlign="right">
                            <Button
                                variant="contained"
                                onClick={() => setSelectedTask(null)}
                                sx={{ borderRadius: 2 }}
                                size={isExtraSmallScreen ? "small" : "medium"}
                            >
                                Close
                            </Button>
                        </Box>
                    </Box>
                </Fade>
            </Modal>
        </Box>
    );
};
export default GanttChart;