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
    project_manager: string;
    start: string;
    state: string | null;
    urgency?: string; // <-- added (optional)
}

const GanttChart: React.FC = () => {
    const topScrollRef = React.useRef<HTMLDivElement>(null);
    const bottomScrollRef = React.useRef<HTMLDivElement>(null);
    const ganttContentRef = React.useRef<HTMLDivElement>(null);

    const [tasks, setTasks] = useState<Task[]>([]);
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
    const [selectedTask, setSelectedTask] = useState<BackendTask | null>(null);
    const [backendTasks, setBackendTasks] = useState<BackendTask[]>([]);

    const [viewMode, setViewMode] = useState<ViewMode>(
        (localStorage.getItem("ganttViewMode") as ViewMode) || ViewMode.Month
    );
    const [filterStart, setFilterStart] = useState<string>(
        localStorage.getItem("ganttFilterStart") || ""
    );
    const [filterEnd, setFilterEnd] = useState<string>(
        localStorage.getItem("ganttFilterEnd") || ""
    );

    const urgencyColors: Record<string, string> = {
        red: "#ff0000ff",
        navy: "#0000f7ff",
        green: "#188918",
        orange: "#fc9015ff",
        yellow: "#f9ce09",
        purple: "#4f1588",
        white: "#fefdfd",
        gray: "#bfbfbf",
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
            styles: {
                progressColor: parentColor,
                backgroundColor: parentColor,
            },
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
                    styles: {
                        progressColor: childColor,
                        backgroundColor: childColor,
                    },
                } as Task;
            })
            .filter((c): c is Task => c !== null);

        return [parent, ...children];
    };

    useEffect(() => {
        fetch("http://localhost:5000/gantt-data")
            .then((res) => res.json())
            .then((data: BackendTask[]) => {
                setBackendTasks(data);

                const mapped: Task[] = data.flatMap((item) => mapOneParent(item));
                console.log("mapped tasks count:", mapped.length); // <-- debug
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
        let backendTask =
            backendTasks.find((t) => t.id === task.id) || null;

        if (!backendTask) {
            backendTasks.forEach((parent) => {
                const foundChild = parent.children.find(
                    (c: any) => c.id === task.id
                );
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

    return (
        <div
            style={{
                width: "100%",
                height: "100vh",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            <h2 style={{ margin: 0, marginBottom: "10px" }}>Project Timeline</h2>

            {/* Controls */}
            <div
                style={{
                    marginBottom: "10px",
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                }}
            >
                <label>
                    View Mode:{" "}
                    <select
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value as ViewMode)}
                    >
                        <option value={ViewMode.Day}>Day</option>
                        <option value={ViewMode.Month}>Month</option>
                        <option value={ViewMode.Year}>Year</option>
                    </select>
                </label>

                <label>
                    Start Date:{" "}
                    <input
                        type="date"
                        value={filterStart}
                        onChange={(e) => setFilterStart(e.target.value)}
                    />
                </label>

                <label>
                    End Date:{" "}
                    <input
                        type="date"
                        value={filterEnd}
                        onChange={(e) => setFilterEnd(e.target.value)}
                    />
                </label>

                {(filterStart || filterEnd) && (
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => {
                            setFilterStart("");
                            setFilterEnd("");
                            localStorage.removeItem("ganttFilterStart");
                            localStorage.removeItem("ganttFilterEnd");
                        }}
                    >
                        Clear Dates
                    </Button>
                )}
            </div>

            {/* Gantt with synced scrollbars */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>

                {/* Top horizontal scrollbar */}
                <div
                    ref={topScrollRef}
                    style={{
                        overflowX: "auto",
                        overflowY: "hidden",
                        height: 16,              // same as a native scrollbar
                        position: "sticky",
                        top: 0,
                        background: "#fff",
                        zIndex: 10,
                    }}
                    onScroll={(e) => {
                        if (bottomScrollRef.current) {
                            bottomScrollRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
                        }
                    }}
                >
                    {/* This inner div forces the native scrollbar to appear */}
                    <div
                        style={{
                            width: ganttContentRef.current?.scrollWidth || "100%",
                            height: "1px",  // doesn't matter, just needs content
                        }}
                    />
                </div>



                {/* Main Gantt area with bottom scroll */}
                <div
                    ref={bottomScrollRef}
                    style={{ flex: 1, overflow: "auto", minHeight: 0 }}
                    onScroll={(e) => {
                        if (topScrollRef.current) {
                            topScrollRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
                        }
                    }}
                >
                    <div ref={ganttContentRef}>
                        {filteredTasks.length > 0 ? (
                            <Gantt
                                tasks={filteredTasks}
                                viewMode={viewMode}
                                onClick={handleTaskClick}
                                columnWidth={80}
                                rowHeight={40}
                                listCellWidth="220px"
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
                slotProps={{
                    backdrop: {
                        timeout: 500,
                    },
                }}
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
                            maxWidth: 480,
                        }}
                    >
                        <Typography variant="h6" component="h2" gutterBottom>
                            Project Details
                        </Typography>

                        <Typography><b>ID:</b> {selectedTask?.id}</Typography>
                        <Typography><b>Name:</b> {selectedTask?.name}</Typography>
                        {(selectedTask as any)?.parent_name && (
                            <Typography><b>Parent Project:</b> {(selectedTask as any).parent_name}</Typography>
                        )}
                        {selectedTask?.p_team && <Typography><b>Team:</b> {selectedTask.p_team}</Typography>}

                        {selectedTask?.assign_to && <Typography><b>Assigned To:</b> {selectedTask.assign_to}</Typography>}
                        {selectedTask?.project_manager && <Typography><b>Manager:</b> {selectedTask.project_manager}</Typography>}
                        <Typography><b>Start:</b> {new Date(selectedTask?.start).toDateString()}</Typography>
                        <Typography><b>End:</b> {new Date(selectedTask?.end).toDateString()}</Typography>
                        {selectedTask?.project_details && (
                            <Typography><b>Details:</b> {selectedTask.project_details}</Typography>
                        )}

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
