import subprocess
from utils.save_to_tmp import save_to_temp

def pdf_to_html(pdf):
    # Save the PDF file to a temporary location
    pdf_path = save_to_temp(pdf)

    # Specify the command to run PDFToHTML.jar
    command = [
        'java',
        '-jar',
        'PDFToHTML.jar',
        pdf_path,
        '-fm=EMBED_BASE64',  # Example font handler mode (adjust as needed)
        '-im=EMBED_BASE64'   # Example image handler mode (adjust as needed)
    ]

    try:
        # Run the command and capture the output
        output = subprocess.check_output(command, stderr=subprocess.STDOUT, text=True)
        
        # You can parse the output or further process it as needed
        
        # Return the HTML content and the temporary PDF file path
        return output
    except subprocess.CalledProcessError as e:
        # Handle errors, you can print the error message or raise an exception
        print(f"Error: {e}")
        return None, pdf_path
    finally:
        # Cleanup: Remove the temporary PDF file after processing
        os.remove(pdf_path)
