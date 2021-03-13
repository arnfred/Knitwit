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

Knitwit Errors
--------------

Every so often, the knitwit application seems to stop, and I lazily restart it by pushing an empty commit. I'm not inclined to spend a lot of time debugging this, but I'll jot down a few notes here for the sake of slowly getting it resolved.

On Jan 27 2021 the app stopped with the following failure in the logs:

```
2021-01-27T00:38:45.357670229Z app[web.1]: python2.7: unable to extent pixel cache `Cannot allocate memory' @ fatal/cache.c/CacheSignalHandler/3326.
```

I ran the following command to inspect the memory usage on the box:

```
sudo docker stats --no-stream --format "table {{.Name}}\t{{.Container}}\t{{.MemUsage}}" | sort -k 3 -h -r
photos.web.1                   d12d8835bd4b        260.1MiB / 1.947GiB
photo-tools.web.1              36a4cf6b8a73        97.27MiB / 1.947GiB
photo-tools.web.1.1582474017   bee9adde24ba        59.22MiB / 1.947GiB
photo-tools.web.1.1582480561   cc03cacb5fe2        50.77MiB / 1.947GiB
kind.web.1                     8ef9d3815283        47.75MiB / 1.947GiB
penrose.web.1                  6a33d06ade1b        22.92MiB / 1.947GiB
dynkarken.com.web.1            e9babd476019        2.902MiB / 1.947GiB
```

The box has 1Gb of memory. If it were a memory leak in any of the other applications, I'd suspect the memory usage would still be high, since they haven't been reset. It might be a memory leak in the knitwit application, or something else might have required memory at the same time as the app was accessed.

Deployment Errors
-----------------

When deploying I got the following error:

```
nginx: [emerg] unknown directive "charset" in /app/nginx/nginx.conf:13
```

From what I can see, the answer is to delete the dokku cache on the host: https://github.com/dokku/buildpack-nginx/issues/43 

```
ssh dynkarken.com
sudo rm -rf /home/dokku/knitwit/cache/*
```

License
-------

Knitwit is licensed under the MIT license (http://opensource.org/licenses/MIT)
