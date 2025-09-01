from flask import Flask, jsonify
from flask_cors import CORS
import mysql.connector
from datetime import date, datetime

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "csaraebackuponline",
    "port": 3306,
}


def to_iso(d):
    if d is None or d == "" or d == "0000-00-00" or d == "0000-00-00 00:00:00":
        return None

    if isinstance(d, datetime):
        return d.isoformat()
    if isinstance(d, date):
        return datetime(d.year, d.month, d.day).isoformat()

    if isinstance(d, str):
        for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(d, fmt).isoformat()
            except ValueError:
                pass
        return None

    return None


def fetch_data():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    # Fetch projects (now with state, project_manager, project_details, p_team, assign_to)
    cursor.execute(
        """
        SELECT 
            project_id, project_name, urgency, start_date, end_date, 
            state, project_manager, project_details, p_team, assign_to
        FROM projects
        """
    )
    projects = cursor.fetchall()

    # Fetch subprojects (now with subproject_details, assign_to, p_team)
    cursor.execute(
        """
        SELECT 
            project_id, subproject_name, urgency, start_date, sub_end_date, 
            subproject_status, subproject_details, assign_to, p_team
        FROM subprojects
        """
    )
    subprojects = cursor.fetchall()

    cursor.close()
    conn.close()

    # Build parent projects map
    project_map = {}
    for p in projects:
        pid = int(p["project_id"])  # normalize to int
        project_map[pid] = {
            "id": f"P{pid}",
            "name": p["project_name"],
            "start": to_iso(p["start_date"]),
            "end": to_iso(p["end_date"]),
            "urgency": (p["urgency"] or "").strip().lower(),  # 🔹 new field
            "state": p.get("state"),
            "project_manager": p.get("project_manager"),
            "project_details": p.get("project_details"),
            "p_team": p.get("p_team"),
            "assign_to": p.get("assign_to"),
            "children": [],
        }

    # Attach subprojects under parent projects
    for sp in subprojects:
        pid = int(sp["project_id"])  # normalize to int
        if pid in project_map:
            sp_start = to_iso(sp["start_date"])
            sp_end = to_iso(sp["sub_end_date"])
            if sp_start and sp_end:
                project_map[pid]["children"].append(
                    {
                        "id": f"SP{pid}_{sp['subproject_status']}",
                        "name": sp["subproject_name"],
                        "start": sp_start,
                        "end": sp_end,
                        "urgency": (sp["urgency"] or "")
                        .strip()
                        .lower(),  # 🔹 new field
                        "status": sp.get("subproject_status"),
                        "subproject_details": sp.get("subproject_details"),
                        "p_team": sp.get("p_team"),
                        "assign_to": sp.get("assign_to"),
                    }
                )

    # ✅ Sort subprojects under each parent by subproject_status
    for pid, project in project_map.items():
        project["children"].sort(
            key=lambda x: (
                int(x["status"]) if x["status"] and str(x["status"]).isdigit() else 0
            )
        )

    return list(project_map.values())


@app.route("/health")
def health():
    return {"ok": True}


@app.route("/gantt-data")
def gantt_data():
    try:
        data = fetch_data()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=5000, debug=True)
