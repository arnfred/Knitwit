import numpy
import math
from itertools import groupby
from wand.image import Image
from PIL import Image as PImage
import StringIO


def open_image(path, colors, width = 60, crop = None, gauge = [40,40]) :
    # Find height ratio
    height_ratio = gauge[1] / float(gauge[0])

    # Open image, resize and posterize
    with open(path) as fp :
        # Open image
        image = Image(file=fp)
        # Crop
        if crop != None :
            image.crop(crop['x'], crop['y'], crop['w'] + crop['x'], crop['h'] + crop['y'])
            # Resize to width and height ratio
            resize(image, width, height_ratio)
            # Get data
            data = get_data(PImage.open(StringIO.StringIO(image.make_blob('ppm'))))
            # Posterize image to fewer colors
    return posterize(data, colors)


def resize(image, width, height_ratio) :
    img_width, img_height = image.size
    height = round((width / float(img_width)) * img_height / height_ratio)
    image.transform(resize="%ix%i!" % (width, height))
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
    distances = [numpy.sum(d**2,axis=-1) for d in data_minus_colors]
    # Find the shortest norm to find the closest color
    return numpy.argmin(distances, axis=0)


def tolist(data) :
    def make_row(row) :
        return { 'row' : row.tolist() }
    return map(make_row, data)

def run_length_encode(data) :
    def encode_row(row) :
        return [(len(list(g)), int(k)) for k,g in groupby(row)]
    return map(encode_row, data)
