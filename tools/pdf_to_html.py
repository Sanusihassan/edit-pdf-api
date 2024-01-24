import os
import subprocess

def pdf_to_html(pdf_file):
    # Save the PDF file to the temporary directory
    temp_pdf_path = os.path.join('/tmp', 'input.pdf')
    pdf_file.save(temp_pdf_path)

    # Output HTML file path
    output_html_path = os.path.join('/tmp', 'output.html')

    # Assuming the PDFToHTML.jar file is in the same directory as this Python script
    jar_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'PDFToHTML.jar')

    # Building the command to run
    command = ['java', '-jar', jar_path, temp_pdf_path, output_html_path]

    try:
        # Run the command
        subprocess.run(command, check=True)

        return output_html_path
    except subprocess.CalledProcessError as e:
        return None
    except Exception as e:
        return None
