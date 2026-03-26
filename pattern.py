import numpy
import math
from PIL import Image
import colorconv


def open_image(path, colors, width = 60, crop = None, gauge = [40,40]) :
    # Find height ratio
    height_ratio = gauge[1] / float(gauge[0])

    # Open image and convert to RGB
    image = Image.open(path).convert('RGB')

    # Crop
    if crop != None :
        image = image.crop((crop['x'], crop['y'], crop['w'] + crop['x'], crop['h'] + crop['y']))

    # Resize to width and height ratio
    image = resize(image, width, height_ratio)

    # Get pixel data as numpy array
    data = numpy.array(image, dtype=numpy.uint8)

    # Posterize image to fewer colors
    return posterize(data, colors)


def resize(image, width, height_ratio) :
    img_width, img_height = image.size
    height = int(math.floor((width / float(img_width)) * img_height / height_ratio))
    return image.resize((width, height), Image.LANCZOS)


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

    # Subtract the two images
    data_diff = data_lab - color_lab

    # Add luminance scale
    data_diff[:,:,0] = data_diff[:,:,0] * luminance_factor

    # Find distance for each pixel and return
    return numpy.sum(data_diff**2,axis=-1)


def tolist(data) :
    def make_row(row) :
        return { 'row' : row.tolist() }
    return list(map(make_row, data))
