#!/usr/bin/env python3
"""
Simple SQLite Database Browser
Run this script to access your calendar database through a web interface.
"""

import sqlite3
import os
from flask import Flask, render_template, request, jsonify, g
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'db-browser-key'

# Database path
DATABASE_PATH = os.path.join('instance', 'calendar.db')

def get_db():
    """Get database connection"""
    if not os.path.exists(DATABASE_PATH):
        return None
    
    db = sqlite3.connect(DATABASE_PATH)
    db.row_factory = sqlite3.Row  # This allows us to access columns by name
    return db

def get_table_names():
    """Get all table names in the database"""
    db = get_db()
    if db is None:
        return []
    
    cursor = db.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    db.close()
    return tables

def get_table_info(table_name):
    """Get column information for a table"""
    db = get_db()
    if db is None:
        return []
    
    cursor = db.cursor()
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    db.close()
    return columns

def get_table_data(table_name, limit=100):
    """Get data from a table"""
    db = get_db()
    if db is None:
        return []
    
    cursor = db.cursor()
    cursor.execute(f"SELECT * FROM {table_name} LIMIT {limit}")
    data = cursor.fetchall()
    db.close()
    return data

@app.route('/')
def index():
    """Main page showing all tables"""
    if not os.path.exists(DATABASE_PATH):
        return f"""
        <html>
        <head><title>Database Not Found</title></head>
        <body style="font-family: Arial, sans-serif; margin: 40px;">
            <h1>Database Not Found</h1>
            <p>The database file <code>{DATABASE_PATH}</code> does not exist.</p>
            <p>Make sure your calendar application has been run at least once to create the database.</p>
        </body>
        </html>
        """
    
    tables = get_table_names()
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Calendar Database Browser</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
            .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
            h1 {{ color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }}
            .table-list {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }}
            .table-card {{ background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 15px; text-align: center; }}
            .table-card:hover {{ background: #e9ecef; cursor: pointer; }}
            .table-card a {{ text-decoration: none; color: #007bff; font-weight: bold; }}
            .table-card a:hover {{ color: #0056b3; }}
            .info {{ background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 6px; margin: 20px 0; }}
            .sql-query {{ background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 6px; margin: 20px 0; }}
            textarea {{ width: 100%; height: 100px; font-family: monospace; }}
            button {{ background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }}
            button:hover {{ background: #0056b3; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📊 Calendar Database Browser</h1>
            
            <div class="info">
                <strong>Database:</strong> {DATABASE_PATH}<br>
                <strong>Tables found:</strong> {len(tables)}
            </div>
    """
    
    if tables:
        html += """
            <h2>📋 Tables</h2>
            <div class="table-list">
        """
        for table in tables:
            html += f"""
                <div class="table-card">
                    <a href="/table/{table}">{table}</a>
                </div>
            """
        
        html += """
            </div>
            
            <h2>🔍 Custom SQL Query</h2>
            <div class="sql-query">
                <form action="/query" method="post">
                    <label for="sql">Enter SQL Query:</label><br>
                    <textarea name="sql" placeholder="SELECT * FROM events LIMIT 10;"></textarea><br><br>
                    <button type="submit">Execute Query</button>
                </form>
            </div>
        """
    else:
        html += "<p>No tables found in the database.</p>"
    
    html += """
        </div>
    </body>
    </html>
    """
    
    return html

@app.route('/table/<table_name>')
def view_table(table_name):
    """View data from a specific table"""
    if table_name not in get_table_names():
        return f"Table '{table_name}' not found", 404
    
    columns = get_table_info(table_name)
    data = get_table_data(table_name)
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Table: {table_name}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
            .container {{ max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
            h1 {{ color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            th, td {{ border: 1px solid #dee2e6; padding: 8px; text-align: left; }}
            th {{ background-color: #007bff; color: white; font-weight: bold; }}
            tr:nth-child(even) {{ background-color: #f8f9fa; }}
            tr:hover {{ background-color: #e9ecef; }}
            .back-link {{ display: inline-block; margin-bottom: 20px; color: #007bff; text-decoration: none; }}
            .back-link:hover {{ color: #0056b3; }}
            .table-info {{ background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 6px; margin: 20px 0; }}
            .no-data {{ text-align: center; color: #6c757d; font-style: italic; padding: 40px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <a href="/" class="back-link">← Back to Database Overview</a>
            <h1>📋 Table: {table_name}</h1>
            
            <div class="table-info">
                <strong>Columns:</strong> {len(columns)} | <strong>Rows:</strong> {len(data)}
            </div>
    """
    
    if data:
        html += """
            <table>
                <thead>
                    <tr>
        """
        
        # Add column headers
        for col in columns:
            col_name = col[1]  # Column name
            col_type = col[2]  # Column type
            html += f"<th>{col_name}<br><small>({col_type})</small></th>"
        
        html += """
                    </tr>
                </thead>
                <tbody>
        """
        
        # Add data rows
        for row in data:
            html += "<tr>"
            for value in row:
                # Format the value for display
                if value is None:
                    display_value = "<em>NULL</em>"
                elif isinstance(value, str) and len(value) > 50:
                    display_value = value[:50] + "..."
                else:
                    display_value = str(value)
                html += f"<td>{display_value}</td>"
            html += "</tr>"
        
        html += """
                </tbody>
            </table>
        """
    else:
        html += '<div class="no-data">No data found in this table.</div>'
    
    html += """
        </div>
    </body>
    </html>
    """
    
    return html

@app.route('/query', methods=['POST'])
def execute_query():
    """Execute a custom SQL query"""
    sql = request.form.get('sql', '').strip()
    
    if not sql:
        return "No query provided", 400
    
    try:
        db = get_db()
        if db is None:
            return "Database not found", 404
        
        cursor = db.cursor()
        cursor.execute(sql)
        
        # Check if it's a SELECT query
        if sql.lower().strip().startswith('select'):
            results = cursor.fetchall()
            columns = [description[0] for description in cursor.description]
        else:
            db.commit()
            results = []
            columns = []
        
        db.close()
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Query Results</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
                .container {{ max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                h1 {{ color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                th, td {{ border: 1px solid #dee2e6; padding: 8px; text-align: left; }}
                th {{ background-color: #007bff; color: white; font-weight: bold; }}
                tr:nth-child(even) {{ background-color: #f8f9fa; }}
                tr:hover {{ background-color: #e9ecef; }}
                .back-link {{ display: inline-block; margin-bottom: 20px; color: #007bff; text-decoration: none; }}
                .back-link:hover {{ color: #0056b3; }}
                .query-info {{ background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 6px; margin: 20px 0; }}
                .success {{ background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }}
                pre {{ background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }}
            </style>
        </head>
        <body>
            <div class="container">
                <a href="/" class="back-link">← Back to Database Overview</a>
                <h1>🔍 Query Results</h1>
                
                <div class="query-info">
                    <strong>Query:</strong><br>
                    <pre>{sql}</pre>
                </div>
        """
        
        if columns and results:
            html += f"""
                <div class="query-info success">
                    <strong>Results:</strong> {len(results)} rows returned
                </div>
                
                <table>
                    <thead>
                        <tr>
            """
            
            for col in columns:
                html += f"<th>{col}</th>"
            
            html += """
                        </tr>
                    </thead>
                    <tbody>
            """
            
            for row in results:
                html += "<tr>"
                for value in row:
                    if value is None:
                        display_value = "<em>NULL</em>"
                    else:
                        display_value = str(value)
                    html += f"<td>{display_value}</td>"
                html += "</tr>"
            
            html += """
                    </tbody>
                </table>
            """
        elif sql.lower().strip().startswith('select'):
            html += '<div class="query-info">Query executed successfully, but returned no results.</div>'
        else:
            html += '<div class="query-info success">Query executed successfully.</div>'
        
        html += """
            </div>
        </body>
        </html>
        """
        
        return html
        
    except Exception as e:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Query Error</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
                .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .error {{ background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 6px; }}
                .back-link {{ display: inline-block; margin-bottom: 20px; color: #007bff; text-decoration: none; }}
                pre {{ background: #f8f9fa; padding: 10px; border-radius: 4px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <a href="/" class="back-link">← Back to Database Overview</a>
                <h1>❌ Query Error</h1>
                
                <div class="error">
                    <strong>Error:</strong> {str(e)}<br><br>
                    <strong>Query:</strong><br>
                    <pre>{sql}</pre>
                </div>
            </div>
        </body>
        </html>
        """

if __name__ == '__main__':
    print("🚀 Starting Calendar Database Browser...")
    print(f"📂 Database path: {DATABASE_PATH}")
    print("🌐 Open your browser and go to: http://localhost:5001")
    print("⚠️  Make sure your main calendar app is not running to avoid database conflicts")
    print("📝 Press Ctrl+C to stop the database browser")
    print("-" * 60)
    
    app.run(debug=True, port=5001, host='127.0.0.1')