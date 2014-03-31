define(["lib/jquery", "js/capture", "text!templates/upload.html", "lib/Ractive.min", "lib/Ractive-events-tap", "lib/Ractive-transitions-fade", "lib/jcrop/jcrop"],
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
				show : true,
				file : undefined,
				file_name : "Upload File"
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

		// Show preview once the image has been uploaded
		view.observe("upload.file", upload_image)

		// For capturing image with webcam
		view.on("capture-image", capture_image);
	}



	////////////////////////////////////////
	//                                    //
	//              Functions             //
	//                                    //
	////////////////////////////////////////


	// Uploads image to server and receives the url back
	var upload_image = function(new_value, old_value) {

		view.set("upload.file_name", new_value[0].name);

		// Now upload image
		var data = new FormData();
		data.append('image', new_value[0]);

		$.ajax({
			url: '/upload/',
			data: data,
			cache: false,
			contentType: false,
			processData: false,
			type: 'POST',
			success: function(response){ 
				show_preview($.parseJSON(response).path); 
			}
		});
	}


	// Shows the preview of the uploaded image and allows user to crop it
	var show_preview = function(path) {

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


	// Enables the webcam and fades in the controls for it
	var capture_image = function() {

		// Show video
		view.set('capture', true);

		// Start video
		var w = $("#upload-buttons").width();
		var take_picture = capture("#video", "#canvas", w);

		// when photo is taken, show image and hide video
		$("#video").on("click", function() {
			var data_url = take_picture();
			upload_capture(data_url);
			$("#video").hide();
			$("#canvas").show();
		});
	}


	// Uploads data url
	function upload_capture(data_url) {
		$.post('/photo/',{
			img : data_url
		},
		function(data) {
			// Hide capture
			view.set('capture', false);

			// Get image
			var image_data = $.parseJSON(data);
			show_preview(image_data.path);
		});
	}


	////////////////////////////////////////
	//                                    //
	//               Return               //
	//                                    //
	////////////////////////////////////////

	view.events();
	return view;
	

});
