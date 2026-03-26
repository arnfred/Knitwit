import json
import logging
import os
import random
import re
import socket
import string
import sys
import time
import urllib.request
from binascii import a2b_base64
from ipaddress import ip_address
from urllib.parse import urlparse

from flask import Flask, jsonify, render_template, request
from wand.image import Image

import pattern

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

MAX_IMAGE_DIMENSION = 2000
UPLOAD_MAX_AGE_SECONDS = 24 * 60 * 60  # 24 hours
ALLOWED_URL_SCHEMES = {'http', 'https'}

app = Flask(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def json_error(error) :
    return jsonify({ 'status': 'fail', 'error': error })


def is_safe_url(url) :
    """Check that a URL is safe to fetch (no SSRF into internal networks)."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ALLOWED_URL_SCHEMES :
            return False
        hostname = parsed.hostname
        if hostname is None :
            return False
        addr_info = socket.getaddrinfo(hostname, parsed.port or 80)
        for _, _, _, _, sockaddr in addr_info :
            ip = ip_address(sockaddr[0])
            if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local :
                return False
        return True
    except Exception :
        return False


def cap_image_size(img) :
    """Resize image so neither dimension exceeds MAX_IMAGE_DIMENSION."""
    w, h = img.size
    if w > MAX_IMAGE_DIMENSION or h > MAX_IMAGE_DIMENSION :
        ratio = min(MAX_IMAGE_DIMENSION / float(w), MAX_IMAGE_DIMENSION / float(h))
        img.resize(int(w * ratio), int(h * ratio))


def cleanup_old_uploads(upload_dir="static/data/uploads/") :
    """Delete uploaded images older than UPLOAD_MAX_AGE_SECONDS."""
    try:
        now = time.time()
        for filename in os.listdir(upload_dir) :
            filepath = os.path.join(upload_dir, filename)
            if os.path.isfile(filepath) and now - os.path.getmtime(filepath) > UPLOAD_MAX_AGE_SECONDS :
                os.remove(filepath)
    except Exception :
        pass


def random_file_name(dir_path, ending="", length=10) :
    while True :
        name = ''.join(random.choice(string.ascii_lowercase) for _ in range(length))
        path = dir_path + name + ending
        if not os.path.isfile(path) :
            return path


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route('/')
def index() :
    return render_template('main.html')


@app.route('/web/', methods=['POST'])
def from_web() :
    url = request.form.get('url', '')

    if url == '' :
        return json_error('No URL specified')

    if not is_safe_url(url) :
        return json_error('Invalid or disallowed URL')

    try:
        url_obj = urllib.request.urlopen(url)
        url_info = url_obj.info()
    except IOError :
        return json_error('404 - File not found')
    except Exception as e :
        log.warning("Error fetching URL %s: %s", url, e)
        return json_error('Error while fetching image')

    if int(url_info["Content-Length"]) > 2000000 :
        return json_error('Image must be less than 1 mb')

    try:
        content = url_info["Content-Type"]
        img_type = content.split("image/")[1]
    except IndexError :
        return json_error('Not an image file')
    except Exception as e :
        log.warning("Error checking image type: %s", e)
        return json_error('Error while checking image type')

    path = random_file_name("static/data/uploads/", "." + img_type)

    try:
        with Image(file=url_obj) as img :
            cap_image_size(img)
            img.format = 'jpeg'
            img.save(filename=path)
            return jsonify({ 'status': 'ok', 'path': path })
    except Exception as e :
        log.warning("Error saving image from URL: %s", e)
        return json_error('Error while saving image')


@app.route('/upload/', methods=['POST'])
def upload() :
    cleanup_old_uploads()

    im_file = request.files['image']

    path = random_file_name("static/data/uploads/", ".jpg")

    try:
        with Image(file=im_file) as img :
            cap_image_size(img)
            img.format = 'jpeg'
            img.save(filename=path)
            return jsonify({ 'path': path })
    except Exception as e :
        log.warning("Error saving uploaded image: %s", e)
        return json_error(str(e))


@app.route('/photo/', methods=['POST'])
def photo() :
    img_data = request.form['img']

    url_pattern = re.compile('data:image/(png|jpeg);base64,(.*)$')
    im_file = url_pattern.match(img_data).group(2)

    try:
        path_jpg = random_file_name("static/data/uploads/", ".jpg")
        binary_data = a2b_base64(im_file)

        with Image(blob=binary_data) as img :
            cap_image_size(img)
            img.format = 'jpeg'
            img.save(filename=path_jpg)

        return jsonify({ 'path': path_jpg })
    except Exception as e :
        log.warning("Error saving photo capture: %s", e)
        return json_error('Error while saving data url')


@app.route('/pattern.json')
def pattern_json() :
    colors = [[c["r"], c["g"], c["b"]] for c in json.loads(request.args['colors'])]
    crop = {str(k): int(v) for k, v in json.loads(request.args['crop']).items()}
    width = int(json.loads(request.args['width']))
    gauge = [int(json.loads(request.args['gauge'])[k]) for k in ["y", "x"]]
    image = str(request.args['image'])

    try:
        data = pattern.open_image(image, colors, width=width, crop=crop, gauge=gauge)
        return jsonify({ 'data': pattern.tolist(data) })
    except Exception :
        log.exception("Error generating pattern")
        return json_error('Error while loading pattern')


@app.route('/save/', methods=['POST'])
def save() :
    data = json.dumps({
        "pattern": json.loads(request.form['pattern']),
        "name": str(request.form['name']),
        "colors": json.loads(request.form['colors']),
        "gauge": {str(k): int(v) for k, v in json.loads(request.form['gauge']).items()}
    })

    path = random_file_name("static/data/pages/", ".json")
    page_id = path.split(".")[0].split("/")[-1]

    try:
        with open(path, 'w') as fp :
            fp.write(data)
        return jsonify({ "id": page_id })
    except Exception as e :
        log.warning("Error saving pattern: %s", e)
        return json_error('Error while saving pattern')


@app.route('/bye/<file_name>')
def cleanup(file_name) :
    if not re.match(r'^[a-z.]+$', file_name) :
        return json_error('Invalid file name')

    path = "static/data/uploads/%s" % file_name
    try:
        if os.path.isfile(path) :
            os.remove(path)
    except Exception as e :
        log.warning("Error removing file %s: %s", file_name, e)
        return json_error('Error while removing image')
    return '', 200


@app.route('/p/<page_id>')
def page(page_id) :
    if not re.match(r'^[a-z]+$', page_id) :
        return render_template('error.html', error="Invalid pattern ID"), 404

    path = "static/data/pages/" + page_id + ".json"

    if not os.path.isfile(path) :
        return render_template('error.html', error="Pattern not found: " + page_id), 404

    try:
        with open(path, 'r') as fp :
            p = json.loads(fp.read())
            return render_template('page.html', name=p['name'], page_id=page_id)
    except Exception as e :
        log.warning("Error opening page %s: %s", page_id, e)
        return json_error('Error while opening page')


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__" :
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    app.run(host='0.0.0.0', port=port)
