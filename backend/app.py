import json
import os
import re
from datetime import datetime
from flask import Flask, request, send_file, jsonify, make_response
from flask_cors import CORS
from map_generator import RegionalMapGenerator

app = Flask(__name__)

# Basic CORS setup
CORS(app)

def validate_email(email):
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None

def validate_phone(phone):
    # Remove non-digit characters and check if it's a valid phone number
    digits = re.sub(r'\D', '', phone)
    return len(digits) >= 9 and len(digits) <= 15

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.add('Access-Control-Expose-Headers', 'Content-Disposition')
    return response

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/generate-map', methods=['POST', 'OPTIONS'])
def generate_map():
    # Handle preflight request
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    try:
        data = request.json
        regions = data['regions']
        export_settings = data['exportSettings']
        
        # Create map generator instance
        map_gen = RegionalMapGenerator()
        
        # Add regions
        for region in regions:
            map_gen.add_region(
                name=region['name'],
                territories=region['states'],
                color=region['color'],
                sales_rep=region['salesRep'],
                sales_number=int(region['salesNumber'])
            )
        
        # Generate map
        output_path = os.path.join(UPLOAD_FOLDER, 'generated_map.png')
        map_gen.generate_map(
            figsize=(export_settings['width']/100, export_settings['height']/100),
            output_path=output_path,
            dpi=export_settings['dpi']
        )
        
        return send_file(output_path, mimetype='image/png', as_attachment=True)
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@app.route('/export-regions', methods=['POST'])
def export_regions():
    try:
        # Get regions data from request
        data = request.json
        
        # Create exports directory if it doesn't exist
        if not os.path.exists('exports'):
            os.makedirs('exports')
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'regions_export_{timestamp}.json'
        filepath = os.path.join('exports', filename)
        
        # Write the regions data directly to file
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        
        return send_file(filepath, 
                       mimetype='application/json',
                       as_attachment=True,
                       download_name=filename)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/import-regions', methods=['POST'])
def import_regions():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.endswith('.json'):
            return jsonify({'error': 'File must be JSON format'}), 400
        
        # Read and parse JSON data
        try:
            content = file.read()
            data = json.loads(content)
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid JSON format'}), 400

        # Validate sales people data
        if not isinstance(data.get('salesPeople'), list):
            return jsonify({'error': 'Invalid sales people data format'}), 400

        for person in data['salesPeople']:
            # Check required fields
            required_fields = ['id', 'firstName', 'lastName', 'email', 'phone']
            if not all(field in person for field in required_fields):
                return jsonify({'error': 'Missing required fields in sales person data'}), 400

            # Validate email format
            if not validate_email(person['email']):
                return jsonify({
                    'error': f"Invalid email format for {person['firstName']} {person['lastName']}"
                }), 400

            # Validate phone format
            if not validate_phone(person['phone']):
                return jsonify({
                    'error': f"Invalid phone format for {person['firstName']} {person['lastName']}"
                }), 400

        # Validate regions data
        if not isinstance(data.get('regions'), dict):
            return jsonify({'error': 'Invalid regions data format'}), 400

        sales_person_ids = {person['id'] for person in data['salesPeople']}

        for region_name, region_data in data['regions'].items():
            # Check required fields
            if not all(field in region_data for field in ['territories', 'color', 'salesPersonId']):
                return jsonify({
                    'error': f"Missing required fields in region {region_name}"
                }), 400

            # Validate territories is an array
            if not isinstance(region_data['territories'], list):
                return jsonify({
                    'error': f"Invalid territories data for region {region_name}"
                }), 400

            # Validate color format (hex color)
            if not re.match(r'^#[0-9A-Fa-f]{6}$', region_data['color']):
                return jsonify({
                    'error': f"Invalid color format for region {region_name}"
                }), 400

            # Validate salesPersonId exists
            if region_data['salesPersonId'] not in sales_person_ids:
                return jsonify({
                    'error': f"Referenced sales person ID not found for region {region_name}"
                }), 400

        # If all validation passes, return the processed data
        return jsonify({
            'message': 'Regions imported successfully',
            'salesPeople': data['salesPeople'],
            'regions': data['regions']
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)