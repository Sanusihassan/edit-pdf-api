import os
from flask import request, jsonify, send_file, after_this_request
from utils.validate_file import validate_file
from tools.pdf_to_html import pdf_to_html

def pdf_to_html_route(app):
    @app.route('/convert-to-html', methods=['POST'])
    def pdf_to_html_file():
        if 'files' not in request.files:
            return jsonify({"error": "No PDF file provided"}), 400
        files = request.files.getlist('files')
        error = validate_file(files)
        if error:
            response = jsonify(error)
            response.headers['Content-Type'] = 'application/json'
            return jsonify({"error": response}), 400
        if len(files) == 1:
            result = None  # Initialize the result variable outside the try block
            response = None  # Initialize the response variable outside the try block
            try:
                # Call the pdf_to_html function with the files
                result = pdf_to_html(files[0])
                # Check the file extension of the result
                if result and (result.endswith('.html') or result.endswith('.htm')):
                    # If the result is an HTML file, return it as a response
                    response = send_file(result, mimetype='text/html',
                                        as_attachment=True, download_name='converted.html', conditional=True)
                elif result and result.endswith('.zip'):
                    # If the result is a ZIP file, return it as a response
                    response = send_file(result, mimetype='application/zip',
                                        as_attachment=True, download_name='converted.zip', conditional=True)
            except Exception as e:
                # Handle exceptions here if necessary
                print(f"Error: {e}")
            finally:
                # Cleanup: Remove the temporary result file if it exists
                if result and os.path.exists(result):
                    os.remove(result)

                if response:
                    response.headers['X-Accel-Buffering'] = 'no'
                    response.headers['Cache-Control'] = 'no-cache'
                    response.headers['Connection'] = 'close'
                    return response
