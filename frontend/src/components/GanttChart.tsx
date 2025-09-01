import React, { useEffect, useState } from "react";
import { Gantt, type Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { Modal, Backdrop, Fade, Box, Typography, Button } from "@mui/material";

interface BackendTask {
    assign_to: string;
    children: any[];
    color: string;
    end: string;
    id: string;
    name: string;
    p_team: string;
    project_details: string;
    subproject_details: string;
    project_manager: string;
    start: string;
    state: string | null;
    urgency?: string;
    parent_name: string | null;
}

const GanttChart: React.FC = () => {
    const topScrollRef = React.useRef<HTMLDivElement>(null);
    const bottomScrollRef = React.useRef<HTMLDivElement>(null);
    const ganttContentRef = React.useRef<HTMLDivElement>(null);

    const [tasks, setTasks] = useState<Task[]>([]);
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
    const [selectedTask, setSelectedTask] = useState<BackendTask | null>(null);
    const [backendTasks, setBackendTasks] = useState<BackendTask[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<ViewMode>(
        (localStorage.getItem("ganttViewMode") as ViewMode) || ViewMode.Month
    );
    const [filterStart, setFilterStart] = useState<string>(
        localStorage.getItem("ganttFilterStart") || ""
    );
    const [filterEnd, setFilterEnd] = useState<string>(
        localStorage.getItem("ganttFilterEnd") || ""
    );

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

    // Define consistent column widths
    const colWidths = {
        id: "80px",
        pm: "140px",
        sd: "120px",
        eed: "120px",
    };

    const mapOneParent = (item: BackendTask): Task[] => {
        if (!item.start || !item.end) return [];

        const startDate = new Date(item.start);
        const endDate = new Date(item.end);
        const parentColor = urgencyColors[item.urgency || "gray"] || "#bfbfbf";

        const parent: Task = {
            id: item.id,
            name: item.name,
            start: startDate,
            end: endDate,
            type: "project",
            progress: 0,
            isDisabled: false,
            styles: { progressColor: parentColor, backgroundColor: parentColor },
        };

        const children: Task[] = (item.children || [])
            .map((child) => {
                if (!child.start || !child.end) return null;
                const cStart = new Date(child.start);
                const cEnd = new Date(child.end);
                const childColor = urgencyColors[child.urgency || "gray"] || "#bfbfbf";
                return {
                    id: child.id,
                    name: `→ ${child.name}`,
                    start: cStart,
                    end: cEnd,
                    type: "task",
                    project: item.id,
                    progress: 0,
                    isDisabled: false,
                    styles: { progressColor: childColor, backgroundColor: childColor },
                } as Task;
            })
            .filter((c): c is Task => c !== null);

        return [parent, ...children];
    };

    const TaskListHeader: React.FC<any> = ({ headerHeight, rowWidth, fontFamily, fontSize }) => (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                height: headerHeight,
                width: rowWidth,
                fontFamily,
                fontSize,
                borderBottom: "2px solid #ddd",
                backgroundColor: "#f5f5f5",
            }}
        >
            <div style={{
                flex: `0 0 ${colWidths.id}`,
                padding: "6px 8px",
                fontWeight: 600,
                borderRight: "1px solid #ddd"
            }}>ID</div>
            <div style={{
                flex: `0 0 ${colWidths.pm}`,
                padding: "6px 8px",
                fontWeight: 600,
                borderRight: "1px solid #ddd"
            }}>PM</div>
            <div style={{
                flex: `0 0 ${colWidths.sd}`,
                padding: "6px 8px",
                fontWeight: 600,
                borderRight: "1px solid #ddd"
            }}>SD</div>
            <div style={{
                flex: `0 0 ${colWidths.eed}`,
                padding: "6px 8px",
                fontWeight: 600
            }}>EED</div>
        </div>
    );

    const TaskListTable: React.FC<any> = ({ rowHeight, rowWidth, fontFamily, fontSize, locale, tasks }) => (
        <div style={{ width: rowWidth, fontFamily, fontSize }}>
            {tasks.map((t: Task) => {
                const projectId = t.type === "project" ? t.id : (t.project || t.id);
                const parent = backendTasks.find((b) => b.id === projectId);
                const managerFull = parent?.project_manager || "N/A";
                const manager = managerFull.split(" ")[0]; // take only the first word
                const startStr = t.start instanceof Date ? t.start.toLocaleDateString(locale) : String(t.start);
                const endStr = t.end instanceof Date ? t.end.toLocaleDateString(locale) : String(t.end);
                const isSelected = selectedTaskId === t.id;

                return (
                    <div
                        key={t.id}
                        onClick={() => setSelectedTaskId(t.id)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            height: rowHeight,
                            background: isSelected ? "rgba(0,0,0,0.04)" : undefined,
                            cursor: "pointer",
                            borderBottom: "1px solid #ddd",
                        }}
                    >
                        <div style={{
                            flex: `0 0 ${colWidths.id}`,
                            padding: "4px 8px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            borderRight: "1px solid #ddd"
                        }}>
                            {projectId}
                        </div>
                        <div style={{
                            flex: `0 0 ${colWidths.pm}`,
                            padding: "4px 8px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            borderRight: "1px solid #ddd"
                        }}>
                            {manager}
                        </div>
                        <div style={{
                            flex: `0 0 ${colWidths.sd}`,
                            padding: "4px 8px",
                            borderRight: "1px solid #ddd"
                        }}>{startStr}</div>
                        <div style={{
                            flex: `0 0 ${colWidths.eed}`,
                            padding: "4px 8px"
                        }}>{endStr}</div>
                    </div>
                );
            })}
        </div>
    );

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
        if (filterStart) {
            const startDate = new Date(filterStart);
            filtered = filtered.filter((t) => t.end >= startDate);
        }
        if (filterEnd) {
            const endDate = new Date(filterEnd);
            filtered = filtered.filter((t) => t.start <= endDate);
        }
        setFilteredTasks(filtered);
    }, [filterStart, filterEnd, tasks]);

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
                        project_manager: foundChild.project_manager || parent.project_manager,
                        parent_name: parent.name,
                    };
                }
            });
        }
        setSelectedTask(backendTask);
    };

    return (
        <div style={{ width: "100%", height: "100vh", margin: 0, padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <h2 style={{ margin: 0, marginBottom: "10px" }}>Project Timeline</h2>

            {/* Controls */}
            <div style={{ marginBottom: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <label>
                    View Mode:{" "}
                    <select value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)}>
                        <option value={ViewMode.Day}>Day</option>
                        <option value={ViewMode.Month}>Month</option>
                        <option value={ViewMode.Year}>Year</option>
                    </select>
                </label>

                <label>
                    Start Date:{" "}
                    <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
                </label>

                <label>
                    End Date:{" "}
                    <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
                </label>

                {(filterStart || filterEnd) && (
                    <Button variant="outlined" color="secondary" onClick={() => { setFilterStart(""); setFilterEnd(""); localStorage.removeItem("ganttFilterStart"); localStorage.removeItem("ganttFilterEnd"); }}>
                        Clear Dates
                    </Button>
                )}
            </div>

            {/* Gantt wrapper: column flex, prevent outer overflow */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
                {/* Top horizontal scrollbar */}
                <div
                    ref={topScrollRef}
                    style={{ overflowX: "auto", overflowY: "hidden", height: 16, position: "sticky", top: 0, background: "#fff", zIndex: 10 }}
                    onScroll={(e) => { if (bottomScrollRef.current) bottomScrollRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft; }}
                >
                    <div style={{ width: ganttContentRef.current?.scrollWidth || "100%", height: "1px" }} />
                </div>

                {/* Main scrollable Gantt area (ONLY this scrolls) */}
                <div
                    ref={bottomScrollRef}
                    style={{ flex: 1, overflow: "auto", minHeight: 0 }}
                    onScroll={(e) => { if (topScrollRef.current) topScrollRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft; }}
                >
                    <div ref={ganttContentRef}>
                        {filteredTasks.length > 0 ? (
                            <Gantt
                                tasks={filteredTasks}
                                viewMode={viewMode}
                                onClick={handleTaskClick}
                                columnWidth={80}
                                rowHeight={32}
                                listCellWidth="440px"
                                TaskListHeader={TaskListHeader}
                                TaskListTable={TaskListTable}
                            />
                        ) : (
                            <p>No valid tasks to display...</p>
                        )}
                    </div>
                </div>
            </div>

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
                            position: "absolute" as const,
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            bgcolor: "background.paper",
                            borderRadius: 2,
                            boxShadow: 24,
                            p: 3,
                            width: "90%",
                            maxWidth: 600,
                            maxHeight: "80vh",
                            overflowY: "auto",
                        }}
                    >
                        <Typography variant="h6" component="h2" gutterBottom>
                            {selectedTask?.parent_name ? "Subproject Details" : "Project Details"}
                        </Typography>

                        {selectedTask?.parent_name && (
                            <Typography>
                                <strong>Parent Project:</strong> {selectedTask.parent_name}
                            </Typography>
                        )}

                        <Typography>
                            <strong>Name:</strong> {selectedTask?.name}
                        </Typography>

                        <Typography>
                            <strong>Description:</strong> {selectedTask?.project_details || selectedTask?.subproject_details || "N/A"}
                        </Typography>

                        <Typography>
                            <strong>Status:</strong>{" "}
                            {selectedTask?.urgency ? urgencyLabels[selectedTask.urgency] : "N/A"}
                        </Typography>

                        <Typography>
                            <strong>Start Date:</strong>{" "}
                            {selectedTask?.start ? new Date(selectedTask.start).toDateString() : "N/A"}
                        </Typography>

                        <Typography>
                            <strong>Expected End Date:</strong>{" "}
                            {selectedTask?.end ? new Date(selectedTask.end).toDateString() : "N/A"}
                        </Typography>

                        <Typography>
                            <strong>Engineer:</strong> {selectedTask?.assign_to || "N/A"}
                        </Typography>

                        <Typography>
                            <strong>Project Manager:</strong> {selectedTask?.project_manager || "N/A"}
                        </Typography>

                        <Typography>
                            <strong>Team:</strong> {selectedTask?.p_team || "N/A"}
                        </Typography>

                        <Box mt={2} textAlign="right">
                            <Button variant="contained" onClick={() => setSelectedTask(null)}>
                                Close
                            </Button>
                        </Box>
                    </Box>
                </Fade>
            </Modal>
        </div>
    );
};

export default GanttChart;