from flask import Flask, send_from_directory
import os

app = Flask(__name__)

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('.', path)

@app.route('/')
def root():
    return send_from_directory('.', 'index.html')

@app.errorhandler(404)
def page_not_found(e):
    return send_from_directory('.', '404.html'), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=2007) 