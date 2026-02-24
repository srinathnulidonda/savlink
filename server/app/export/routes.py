# server/app/export/routes.py
import io
import csv
import json
from flask import request, g, send_file
from app.export import export_bp
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.export import service


@export_bp.route('/links/json', methods=['GET'])
@require_auth
def export_json():
    data = service.export_links(g.current_user.id, fmt='json')
    return send_file(
        io.BytesIO(json.dumps(data, indent=2, default=str).encode()),
        mimetype='application/json',
        as_attachment=True,
        download_name='savlink-export.json',
    )


@export_bp.route('/links/csv', methods=['GET'])
@require_auth
def export_csv():
    rows = service.export_links(g.current_user.id, fmt='csv')
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys() if rows else [])
    writer.writeheader()
    writer.writerows(rows)
    return send_file(
        io.BytesIO(output.getvalue().encode()),
        mimetype='text/csv',
        as_attachment=True,
        download_name='savlink-export.csv',
    )


@export_bp.route('/links/import', methods=['POST'])
@require_auth
def import_links():
    if 'file' not in request.files:
        return error_response('No file provided', 400)
    file = request.files['file']
    if not file.filename:
        return error_response('Empty filename', 400)
    result = service.import_links(g.current_user.id, file)
    if result.get('error'):
        return error_response(result['error'], 400)
    return success_response(result, status=201)