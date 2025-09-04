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
        for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%a, %d %b %Y %H:%M:%S %Z"):
            try:
                return datetime.strptime(d, fmt).isoformat()
            except ValueError:
                pass
        return None

    return None


def clean_date(d):
    if not d:
        return None

    iso = to_iso(d)
    if iso:
        return iso.split("T")[0]  # ✅ keep only YYYY-MM-DD
    return None


def fetch_data():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    # Fetch projects
    cursor.execute(
        """
        SELECT 
            project_id, project_name, urgency, start_date, end_date, 
            state, project_manager, project_details, p_team, assign_to, reopen_status
        FROM projects
        """
    )
    projects = cursor.fetchall()

    # Fetch subprojects
    cursor.execute(
        """
        SELECT 
            project_id, subproject_name, urgency, start_date, sub_end_date, 
            subproject_status, subproject_details, assign_to, p_team, reopen_status
        FROM subprojects
        """
    )
    subprojects = cursor.fetchall()

    # Fetch invoices
    cursor.execute(
        """
        SELECT 
            project_id, invoice_number, service_date, due_date, 
            payment_status, amount, comments
        FROM csa_finance_invoiced
        """
    )
    invoices = cursor.fetchall()

    # Fetch "ready to be invoiced"
    cursor.execute(
        """
        SELECT 
            project_id, invoice_number, service_date, due_date, 
            project_status, price, comments
        FROM csa_finance_readytobeinvoiced
        """
    )
    ready_invoices = cursor.fetchall()

    # ✅ Fetch unpaid invoices
    cursor.execute(
        """
        SELECT 
            project_id, invoice_no, comments, invoice_date, booked_date, 
            received_date, amount
        FROM unpaidinvoices
        """
    )
    unpaid_invoices = cursor.fetchall()

    cursor.close()
    conn.close()

    # Build parent projects map
    project_map = {}
    for p in projects:
        pid = int(p["project_id"])
        project_map[pid] = {
            "id": pid,
            "name": p["project_name"],
            "start": to_iso(p["start_date"]),
            "end": to_iso(p["end_date"]),
            "urgency": (p["urgency"] or "").strip().lower(),
            "state": p.get("state"),
            "project_manager": p.get("project_manager"),
            "project_details": p.get("project_details"),
            "p_team": p.get("p_team"),
            "assign_to": p.get("assign_to"),
            "reopen_status": p.get("reopen_status"),
            "children": [],
            "invoices": [],
            "ready_to_invoice": [],
        }

    # Attach subprojects
    for sp in subprojects:
        pid = int(sp["project_id"])
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
                        "urgency": (sp["urgency"] or "").strip().lower(),
                        "status": sp.get("subproject_status"),
                        "subproject_details": sp.get("subproject_details"),
                        "p_team": sp.get("p_team"),
                        "assign_to": sp.get("assign_to"),
                        "reopen_status": sp.get("reopen_status"),
                    }
                )

    # ✅ Attach invoices
    for inv in invoices:
        pid = int(inv["project_id"])
        if pid in project_map:
            payment_status = inv.get("payment_status")
            if not payment_status or str(payment_status).strip() == "":
                payment_status = "not paid"

            project_map[pid]["invoices"].append(
                {
                    "invoice_number": inv.get("invoice_number"),
                    "service_date": clean_date(inv.get("service_date")),
                    "due_date": clean_date(inv.get("due_date")),
                    "payment_status": payment_status,
                    "amount": inv.get("amount"),
                    "comments": inv.get("comments"),
                }
            )

    # ✅ Attach "ready to be invoiced"
    for r in ready_invoices:
        pid = int(r["project_id"])
        if pid in project_map:
            status = r.get("project_status")
            if not status or str(status).strip() == "":
                status = "ready to be invoiced"

            if str(status).lower() == "invoiced":
                continue

            project_map[pid].setdefault("ready_to_invoice", []).append(
                {
                    "invoice_number": r.get("invoice_number"),
                    "service_date": clean_date(r.get("service_date")),
                    "due_date": clean_date(r.get("due_date")),
                    "project_status": status,
                    "price": r.get("price"),
                    "comments": r.get("comments"),
                }
            )

    # ✅ Attach unpaid invoices only if present
    for u in unpaid_invoices:
        pid = int(u["project_id"])
        if pid in project_map:
            project_map[pid].setdefault("unpaid_invoices", []).append(
                {
                    "invoice_no": u.get("invoice_no"),
                    "comments": u.get("comments"),
                    "invoice_date": clean_date(u.get("invoice_date")),
                    "booked_date": clean_date(u.get("booked_date")),
                    "received_date": clean_date(u.get("received_date")),
                    "amount": u.get("amount"),
                }
            )

    # ✅ Sort subprojects by status
    for pid, project in project_map.items():
        project["children"].sort(
            key=lambda x: (
                int(x["status"]) if x["status"] and str(x["status"]).isdigit() else 0
            )
        )

    # ✅ Sort parent projects by start date
    projects_list = list(project_map.values())
    projects_list.sort(
        key=lambda p: (
            datetime.fromisoformat(p["start"]) if p["start"] else datetime.max
        )
    )

    return projects_list


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
