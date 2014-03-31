import web
import json
import random, string
import os
import json
import numpy
from PIL import Image
import re
import pattern
from StringIO import StringIO
from binascii import a2b_base64
import itertools


# Define pages
urls = (
  '/', 'index',
  '/save/', 'save',
  '/upload/', 'upload',
  '/photo/', 'photo',
  '/pattern.json', 'pattern_json',
  '/p/(.+)', 'page'
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

# A regular image is uploaded
class upload :
  def POST(self):
    # Get the post data
    form = web.input(image={})

    # Create random image path (10 characters long)
    path = random_file_name("static/data/uploads/", ".jpg")

    # Open path and save file
    with open(path, 'wb') as saved:
      im_file = form['image'].file
      # We open file with PIL to save as jpg
      im = Image.open(im_file)
      im_norm = normalize_image(im);
      im.save(saved, 'JPEG')
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
    path_png = random_file_name("static/data/uploads/", ".png")
    path_jpg = random_file_name("static/data/uploads/", ".jpg")

    # Decode the data and create a binary blob
    binary_data = a2b_base64(im_file)

    # Write binary data
    with open(path_png, 'wb') as fd :
      fd.write(binary_data)

    # Open image and save as jpg
    im = Image.open(path_png)
    im_norm = normalize_image(im);
    im_norm.save(path_jpg, 'JPEG')

    return json.dumps({ 'path' : path_jpg })


class pattern_json :
  def GET(self):
    # Get web input and parse colors
    d = web.input(colors = "", image = "", stitches = "", crop = "")
    colors = [ [c["r"], c["g"], c["b"]] for c in json.loads(d.colors) ]
    crop = { str(k):int(v) for (k,v) in json.loads(d.crop).iteritems() }
    stitches = { str(k):int(v) for (k,v) in json.loads(d.stitches).iteritems() }
    image = str(d.image)

    # Create pattern matrix
    data = pattern.open_image(image, colors, stitches["height"], crop)

    # Check if pattern should be turned
    if data.shape[1] > data.shape[0] and data.shape[1] > 70 :
      data = numpy.rot90(data)

    # Runlength encode data and send to client
    encoded_data = pattern.run_length_encode(data)
    return json.dumps({ 'data' : encoded_data })


class save :
  def POST(self) :
    d = web.input(pattern = "", name = "", colors = "")
    
    # Get a string with all the data
    data = json.dumps({ 
      "pattern" : json.loads(d.pattern),
      "name" : str(d.name),
      "colors" : json.loads(d.colors)
    })

    # Get random name
    path = random_file_name("static/data/pages/", ".json")
    page_id = path.split(".")[0].split("/")[-1]

    # Now save file
    with open(path, 'w') as fp:
      fp.write(data)

    return json.dumps({ "id" : page_id });


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
