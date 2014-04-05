import numpy
from binascii import a2b_base64
import math
from itertools import groupby
from wand.image import Image
from PIL import Image as PImage

def open_image(path, colors, max_height = 60, crop = None) :
	with open(path) as fp :
		# Open image
		image = Image(file=fp)
		# Crop
		if crop != None :
			image.crop(crop['x'], crop['y'], crop['w'] + crop['x'], crop['h'] + crop['y'])
		# Resize to max height
		image.transform(resize="x%i" % max_height)
		# Get numpy array with image data
		image.save(filename="tmp.bmp")
		data = get_data(PImage.open("tmp.bmp"))
		# Remove alpha information from image
		# Posterize image to fewer colors
		return posterize(data, colors)


def resize(image, max_height) :
	width, height = image.size
	new_width = round(height / float(max_height) * width)
	image.thumbnail([new_width, max_height], Image.ANTIALIAS)
	return image


def round(n) :
    if n % 1 > 0.5 :
	return math.ceil(n)
    else :
	return math.floor(n)



def get_data(image) :
	width, height = image.size
	data_array = numpy.array(image.getdata(), dtype=numpy.uint8)
	depth = len(data_array[0])
	return numpy.reshape(data_array, [height, width, depth])


def posterize(data, colors) :
	# Subtract each color from the data to get a list of matrices each containing vectors
	data_minus_colors = [data - c for c in colors]
	# Now take the norm of each vector in each matrix
	distances = [numpy.sum(d**2,axis=-1)**(1./2) for d in data_minus_colors]
	# Find the shortest norm to find the closest color
	return numpy.argmin(distances, axis=0)

def run_length_encode(data) :
    def encode_row(row) :
        return [(len(list(g)), int(k)) for k,g in groupby(row)]
    return map(encode_row, data)


