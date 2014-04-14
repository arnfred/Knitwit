import numpy
import math
from itertools import groupby
from wand.image import Image
from PIL import Image as PImage


def open_image(path, colors, max_height = 60, crop = None, gauge = (10,15)) :
    # Find height ratio
    height_ratio = gauge[1] / float(gauge[0])
    height_percent = round(height_ratio*100)
    print(height_percent)

    # Open image, resize and posterize
    with open(path) as fp :
        # Open image
        image = Image(file=fp)
        # Crop
        if crop != None :
            image.crop(crop['x'], crop['y'], crop['w'] + crop['x'], crop['h'] + crop['y'])
            # Resize to width and height ratio
            resize(image, 60, 1.5)
            # Save as ppm
            image.format = 'ppm'
            # Get numpy array with image data
            image.save(filename="tmp.ppm")
            data = get_data(PImage.open("tmp.ppm"))
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


def run_length_encode(data) :
    def encode_row(row) :
        return [(len(list(g)), int(k)) for k,g in groupby(row)]
    return map(encode_row, data)
