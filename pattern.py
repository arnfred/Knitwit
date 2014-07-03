import numpy
import math
from itertools import groupby
from wand.image import Image
from PIL import Image as PImage
import StringIO
import colorconv


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
    height = math.floor((width / float(img_width)) * img_height / height_ratio)
    image.transform(resize="%ix%i!" % (width, height))
    return image



def get_data(image) :
    width, height = image.size
    data_array = numpy.array(image.getdata(), dtype=numpy.uint8)
    depth = len(data_array[0])
    return numpy.reshape(data_array, [height, width, depth])


def posterize(data, colors) :
    # convert data to Lab color space
    data_lab = colorconv.rgb2lab(data)
    # Now take the norm of each vector in each matrix
    distances = [color_distance(data_lab, c) for c in colors]
    # Find the shortest norm to find the closest color
    return numpy.argmin(distances, axis=0)


def color_to_lab(c) :
    l = colorconv.rgb2lab(numpy.reshape(numpy.array(c, dtype=numpy.uint8),(1,1,3)))
    return numpy.reshape(l,(3))


#According to CIE76 but with a scale for luminance
def color_distance(data_lab, color, luminance_factor = 0.8) :
    # Produce image uniformly colored with color converted to Lab color space
    color_lab = color_to_lab(color)
    color_lab_canvas = numpy.zeros(data_lab.shape)
    color_lab_canvas[:] = color_lab

    # Subtract the two images
    data_diff = data_lab - color_lab_canvas

    # Add luminance scale
    data_diff[:,:,0] = data_diff[:,:,0] * luminance_factor

    # Find distance for each pixel and return
    return numpy.sum(data_diff**2,axis=-1)


def tolist(data) :
    def make_row(row) :
        return { 'row' : row.tolist() }
    return map(make_row, data)

def run_length_encode(data) :
    def encode_row(row) :
        return [(len(list(g)), int(k)) for k,g in groupby(row)]
    return map(encode_row, data)
