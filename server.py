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
  '/upload/', 'upload',
  '/photo/', 'photo',
  '/pattern.json', 'pattern_json'
)

# Define template
render = web.template.render('templates/')

# Index page displays start page
class index :
    def GET(self):
		return render.main()

# A regular image is uploaded
class upload :
	def POST(self):
		# Get the post data
		form = web.input(image={})

		# Create random image path (20 characters long)
		im_path = ''.join(random.choice(string.lowercase) for i in range(20))
		path = "static/uploads/%s%s" % (im_path, ".jpg")

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

		# create image path
		im_path = ''.join(random.choice(string.lowercase) for i in range(20))
		path = "static/uploads/%s%s" % (im_path, ".jpg")
		path_png = "static/uploads/%s%s" % (im_path, ".png")

		# Decode the data and create a binary blob
		binary_data = a2b_base64(im_file)

		# Write binary data
		with open(path_png, 'wb') as fd :
			fd.write(binary_data)

		# Open image and save as jpg
		im = Image.open(path_png)
		im_norm = normalize_image(im);
		im_norm.save(path, 'JPEG')

		return json.dumps({ 'path' : path })


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

# Run the app
if __name__ == "__main__": 
	app = web.application(urls, globals())
	app.run()     


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
