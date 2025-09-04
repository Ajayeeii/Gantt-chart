cursor.execute(
        """
        SELECT 
            project_id, invoice_no, comments, invoice_date, booked_date, 
            received_date, amount, 
        FROM unpaidinvoices
        """
    )
    unpaidinvoices = cursor.fetchall()