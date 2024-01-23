from werkzeug.datastructures import FileStorage
import mimetypes

def is_pdf(file):
    mime_type, _ = mimetypes.guess_type(file.filename)
    file.seek(0)  # Reset file pointer to the beginning
    return mime_type == 'application/pdf'

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

def validate_file(files):
    max_files = 5
    if isinstance(files, FileStorage):
        files = [files]
    if len(files) > max_files:
        return "ERR_MAX_FILES_EXCEEDED"
    if len(files) <= 0:
        return "ERR_NO_FILES_SELECTED"

    for file in files:
        filename: str = file.filename  # type: ignore

        extension = filename.split('.')[-1]
        if not file:
            return 'FILE_CORRUPT'
        if not filename:
            return 'FILE_CORRUPT'
        if not file.content_type:
            return 'NOT_SUPPORTED_TYPE'
        file_contents = file.read()
        if len(file_contents) <= 0:
            return 'EMPTY_FILE'

        # Check file type
        if extension == 'pdf' and not is_pdf(file):
            return 'NOT_SUPPORTED_TYPE'

        if len(file_contents) > MAX_FILE_SIZE:
            return 'FILE_TOO_LARGE'

    return None
