from flask import Flask
from routes.pdf_to_html_route import pdf_to_html_route


app = Flask(__name__)


pdf_to_html_route(app)
if __name__ == '__main__':
    app.run(debug=True)
