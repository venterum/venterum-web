from flask import Flask, render_template, request, send_from_directory
import ipaddress
import requests
import user_agents

app = Flask(__name__)

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

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/kernel_panic')
def kernel_panic():
    return render_template('kernel_panic.html')

@app.route('/kernel_panic/thread/1')
def thread_grub():
    return render_template('thread_grub.html')

@app.route('/kernel_panic/404')
def not_found_retro():
    return render_template('404_retro.html'), 404

@app.route('/kernel_panic/thread/2')
def thread_pentium():
    return render_template('thread_pentium.html')

@app.route('/kernel_panic/thread/3')
def thread_linux():
    return render_template('thread_linux.html')

@app.route('/kernel_panic/thread/4')
def thread_bash():
    return render_template('thread_bash.html')

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=2007)