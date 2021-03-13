define(["lib/jquery", "js/capture", "text!templates/upload.html", "ractive", "ractive_tap", "ractive_fade", "lib/jcrop/jcrop"],
	function($, capture, upload_template, R) {


	////////////////////////////////////////
	//                                    //
	//            Ractor View             //
	//                                    //
	////////////////////////////////////////

	var view = new R({
		template : upload_template,
		el : "upload",
		data : {
			upload : {
                url : undefined,
                last_url : undefined,
				show : true,
				file : undefined,
				file_name : "Upload File",
                web_name : "Use Online Image",
                show_url_input : false
			},
			preview : undefined,
			capture : undefined
		}
	});



	////////////////////////////////////////
	//                                    //
	//               Events               //
	//                                    //
	////////////////////////////////////////

	view.events = function() {

		// For uploading an image
		view.on("upload-image", function() {
			$("#upload-input").click();
		})

        // For uploading from web
        view.on("upload-web", from_web);

        $("#upload-web").keyup(function(event) {
            if (event.keyCode == 13) {
                from_web();
            }
        });

		// Show preview once the image has been uploaded
		view.observe("upload.file", upload_image)

		// For capturing image with webcam
		view.on("capture-image", from_web);

        // Make sure we delete the image before leaving the page
        $(window).on('beforeunload', view.cleanUp);
	}



	////////////////////////////////////////
	//                                    //
	//              Functions             //
	//                                    //
	////////////////////////////////////////


    // Fetches an image from the web
    var from_web = function() {
        // Prompt user for url and make sure to append http
        //url = prompt("Please enter the url of the image:");
        var url = view.get("upload.url");
        var last_url = view.get("upload.last_url");
        if (url == undefined || url == "" || url == last_url) {
            $("#upload-web").focus();
            return false;
        }
        else if (url.substr(0,4) != "http") {
            url = "http://" + url;
        }
        basename = url.split("/").pop().substr(0,33);

        // Update
		view.set("upload.web_name", "Fetching ...");
		view.set("upload.url", url);
		view.set("upload.last_url", url);
        $.post("/web/", { 'url': url }, function(response){
            var data = $.parseJSON(response)
            if (data.status == "fail") {
                view.set("upload.web_name", data.error);
                return;
            }
            view.set("upload.web_name", basename);
            view.show_preview(data.path);
        });
    }


	// Uploads image to server and receives the url back
	var upload_image = function(new_value, old_value) {

		view.set("upload.file_name", new_value[0].name);

		// Now upload image
		var data = new FormData();
		data.append('image', new_value[0]);

        // Set listener for progress
        var xhr_provider = init_progress();

		$.ajax({
			url: '/upload/',
			data: data,
			cache: false,
            xhr : xhr_provider,
			contentType: false,
			processData: false,
			type: 'POST',
			success: function(response){
                progress(0);
				view.show_preview($.parseJSON(response).path);
			}
		});
	}


    view.cleanUp = function() {
        var file = _(view.get("preview.src").split("/")).last();
        $.ajax({
            url: "/bye/" + file,
            type: "GET",
            async: false
        });
    }


	// Shows the preview of the uploaded image and allows user to crop it
	view.show_preview = function(path) {

		var image = new Image();
		image.onload = function(){ // always fires the event.

			// Init crop
			init_crop(image);

			// Disable jcrop if it's already set
			if (view.jcrop != undefined) {
				view.jcrop.destroy();
			}

			// reset height if previously set
			$("#preview-image").css("height","")

			// Attach cropping
			$("#preview-image").Jcrop({
				onSelect: function(data) { set_crop(data, image); },
				onRelease: function() { init_crop(image); }
			}, function() {
				view.jcrop = this;
			});

		};
		image.src = path;
		view.set('preview', { src : path })
	}


	// The crop coordinates match the canvas, but if the image is scaled
	// we need to rescale. This function takes care of that
	var set_crop = function(crop_data, image) {
		// For an image bigger than the container, ratio < 1
		var ratio = image.width / $("#preview-image").width();
		view.set('preview.crop', {
			w : Math.round(crop_data.w * ratio),
			h : Math.round(crop_data.h * ratio),
			x : Math.round(crop_data.x * ratio),
			y : Math.round(crop_data.y * ratio)
		});
	}


	var init_crop = function(image) {
		// Initialize cropping to full image
		view.set('preview.crop', {
			w : image.width,
			h : image.height,
			x : 0,
			y : 0
		});
	}


    // Initialize progress
    var init_progress = function() {
        xhr = $.ajaxSettings.xhr();
        if (xhr.upload) {
            xhr.upload.addEventListener('progress', update_progress, false);
        }
        return function() { return xhr; };
    }


    // Calculates how much of a file we've loaded and updates the progress
    var update_progress = function(e) {
        if (e.lengthComputable) {
            var percentLoaded = (e.loaded / e.total) * 100;
            progress(percentLoaded);
        }
    }


    /*
     * Progress bar for uploads
     */
    var progress = function(n) {
        var b = 0.06;
        var t = 0.56;
        var p = n*(t - b) + b*100;
        $("#upload-image img").css("background-size","50% " + p + "%");
    }


	////////////////////////////////////////
	//                                    //
	//               Return               //
	//                                    //
	////////////////////////////////////////

	view.events();
	return view;


});
