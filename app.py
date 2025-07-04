from flask import Flask, send_from_directory, render_template, request
import os
import requests
import ipaddress
import user_agents

app = Flask(__name__, template_folder='.')

@app.route('/ip')
def ip_lookup():
    ip_address = request.headers.get('X-Forwarded-For', request.remote_addr).split(',')[0].strip()

    query_ip = ip_address
    try:
        ip_obj = ipaddress.ip_address(ip_address)
        if ip_obj.is_private or ip_obj.is_loopback:
            query_ip = ""
    except ValueError:
        pass

    api_url = f'http://ip-api.com/json/{query_ip}?fields=status,message,country,countryCode,regionName,city,lat,lon,timezone,isp,org,query,proxy,hosting,mobile'
    
    ip_data = {}
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        ip_data = response.json()
    except requests.exceptions.RequestException as e:
        ip_data = {'status': 'fail', 'message': str(e), 'query': ip_address}

    ua_string = request.headers.get('User-Agent', '')
    user_agent_data = user_agents.parse(ua_string)

    return render_template('ip.html', ip_data=ip_data, user_agent=user_agent_data)

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