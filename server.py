import web
import json
import random, string
import os
import numpy
import re
import pattern
import urllib
from binascii import a2b_base64
from wand.image import Image


# Define pages
urls = (
    '/', 'index',
    '/save/', 'save',
    '/upload/', 'upload',
    '/web/', 'from_web',
    '/photo/', 'photo',
    '/pattern.json', 'pattern_json',
    '/p/(.+)', 'page',
    '/bye/(.+)', 'cleanup'
)

# Define template
render = web.template.render('templates/')

# Run the app
if __name__ == "__main__":
    app = web.application(urls, globals())
    app.run()


# Index page displays start page
class index :
    def GET(self):
        return render.main()


class from_web:
    def POST(self):
        # Get the post data
        url = web.input(url='')['url']

        # Check that url exists
        if url == '':
            return json.dumps({
                'status': 'fail',
                'error': 'No URL specified'
            });

        # Open url and check that content length isn't ridiculous
        try:
            url_obj = urllib.urlopen(url)
            url_info = url_obj.info()
        except IOError:
            return json.dumps({
                'status': 'fail',
                'error': '404 - File not found'
            });

        print(url_info)
        if int(url_info["Content-Length"]) > 2000000:
            return json.dumps({
                'status': 'fail',
                'error': 'Image must be less than 1 mb'
            });

        # Check that content is an image
        try:
            content = url_info["Content-Type"]
            print(content.split("image/"))
            img_type = content.split("image/")[1]
        except IndexError:
            return json.dumps({
                'status': 'fail',
                'error': 'Not an image file'
            });

        path = random_file_name("static/data/uploads/", "." + img_type)
        print(path)

        with Image(file=url_obj) as img :
            #im_norm = normalize_image(im);
            img.format = 'jpeg'
            img.save(filename=path)
            return json.dumps({
                'status': 'ok',
                'path' : path
            })



# A regular image is uploaded
class upload :
    def POST(self):
        # Get the post data
        form = web.input(image={})

        # Create random image path (10 characters long)
        path = random_file_name("static/data/uploads/", ".jpg")

        # Open path and save file
        #with open(path, 'wb') as saved:
        im_file = form['image'].file
        # We open file with PIL to save as jpg
        with Image(file=im_file) as img :
            #im_norm = normalize_image(im);
            img.format = 'jpeg'
            img.save(filename=path)
            return json.dumps({ 'path' : path })


# A form with a png data url is uploaded
class photo :
    def POST(self):
        # Get post data
        img = web.input()['img']

        # Parse data:image url
        url_pattern = re.compile('data:image/(png|jpeg);base64,(.*)$')

        # im_file contains image data in 64 encoding
        im_file = url_pattern.match(img).group(2)

        # Create random image path (10 characters long)
        #path_png = random_file_name("static/data/uploads/", ".png")
        path_jpg = random_file_name("static/data/uploads/", ".jpg")

        # Decode the data and create a binary blob
        binary_data = a2b_base64(im_file)

        # Write binary data
        with Image(blob=binary_data) as img :
            img.format = 'jpeg'
            img.save(filename=path_jpg)


        return json.dumps({ 'path' : path_jpg })


class pattern_json :
    def GET(self):
        # Get web input and parse colors
        d = web.input(colors = "", image = "", stitches = "", crop = "")
        colors = [ [c["r"], c["g"], c["b"]] for c in json.loads(d.colors) ]
        crop = { str(k):int(v) for (k,v) in json.loads(d.crop).iteritems() }
        width = int(json.loads(d.width))
        gauge = [int(v) for (k,v) in json.loads(d.gauge).iteritems()]
        print(d.gauge)
        print(gauge)
        image = str(d.image)

        # Create pattern matrix
        data = pattern.open_image(image, colors, width=width, crop=crop, gauge=gauge)

        # Runlength encode data and send to client
        return json.dumps({ 'data' : pattern.tolist(data) })


class save :
    def POST(self) :
        d = web.input(pattern = "", name = "", colors = "")

        # Get a string with all the data
        data = json.dumps({
            "pattern" : json.loads(d.pattern),
            "name" : str(d.name),
            "colors" : json.loads(d.colors),
            "gauge" : { str(k):int(v) for (k,v) in json.loads(d.gauge).iteritems() }
        })

        # Get random name
        path = random_file_name("static/data/pages/", ".json")
        page_id = path.split(".")[0].split("/")[-1]

        # Now save file
        with open(path, 'w') as fp:
            fp.write(data)

        return json.dumps({ "id" : page_id });


class cleanup :
    def GET(self, file_name) :
        # Check if file name exists
        path = "static/data/uploads/%s" % file_name
        if os.path.isfile(path) :
            # Remove file
            os.remove(path)


class page :
    def GET(self, page_id) :

        # The path to the page we want to open
        path = "static/data/pages/" + page_id + ".json"

        # Does this page exist? - if not return error
        if not os.path.isfile(path) :
            return render.error("Pattern not found: " + page_id)

        with open(path, 'r') as fp:
            pattern = json.loads(fp.read())
            return render.page(pattern['name'], page_id)



def make_thumbnail(path, size = (200, 200)) :
    name, ext = os.path.splitext(path)
    img = Image.open(path)
    img.thumbnail(size, Image.ANTIALIAS)
    thumbnail_path = "%s_thumb%s" % (name, ext)
    img.save(thumbnail_path, 'JPEG')
    return thumbnail_path


def normalize(arr):
    """
    Linear normalization
    http://en.wikipedia.org/wiki/Normalization_%28image_processing%29
    """
    arr = arr.astype('float')
    # Do not touch the alpha channel
    for i in range(3):
        minval = arr[...,i].min()
        maxval = arr[...,i].max()
        if minval != maxval:
            arr[...,i] -= minval
            arr[...,i] *= (255.0/(maxval-minval))
    return arr


def normalize_image(img):
    img_rgba = img.convert('RGBA')
    arr = numpy.array(numpy.asarray(img_rgba).astype('float'))
    return Image.fromarray(normalize(arr).astype('uint8'),'RGBA')


def random_file_name(dir_path, ending = "", length = 10) :
    # Create random image path (10 characters long)
    is_taken = True
    while is_taken :
        # create image path
        name = ''.join(random.choice(string.lowercase) for i in range(length))
        path = dir_path + name + ending
        is_taken = os.path.isfile(path)
    return path
