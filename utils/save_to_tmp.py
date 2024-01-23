import shutil
import tempfile
import os

def save_to_temp(file):
    name, ext = file.filename.split(".")
    _, tmp_file_descriptor = tempfile.mkstemp(dir='/tmp')
    tmp_file_path = f"{tmp_file_descriptor}.{ext}"
    file.save(tmp_file_path)
    return tmp_file_path