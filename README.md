Knitwit
================

Knitwit is an open-source knitting pattern generator.

To try it out, see [knitwit.dynkarken.com](http://knitwit.dynkarken.com).

You can run knitwit locally by cloning this repository and running ```python server.py```. You will need to have ```web.py```, ```wand```, ```numpy``` and ```Pillow``` (or ```PIL```) installed on your system. You can install them by running ```pip install -r requirements.txt```.

Dokku Setup
-----------

To set up dokku for this repository, we need to mount the `patterns` directory to the local `static/data` directory of the knitwit application:

```
dokku storage:mount knitwit /home/arnfred/patterns:/app/static/data/
```

License
-------

Knitwit is licensed under the MIT license (http://opensource.org/licenses/MIT)
