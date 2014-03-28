define(["lib/jquery", "text!templates/colors.html", "lib/Ractive.min", "lib/Ractive-events-tap", "lib/Ractive-transitions-fade"],
	function($, color_template, R) {


	////////////////////////////////////////
	//                                    //
	//            Ractor View             //
	//                                    //
	////////////////////////////////////////

	var view = new R({
		template : color_template,
		el : "colors",
		data : {
			show : false,
			colors : [{
				r : 20,
				g : 20,
				b : 20
			}, {
				r : 240,
				g : 240,
				b : 230
			}],
			size : {
				width : 60,
				height : 60,
				ratio : 1,
			},
			generate : {
				src : "/static/images/generate.png"
			}
		}
	});

	////////////////////////////////////////
	//                                    //
	//               Events               //
	//                                    //
	////////////////////////////////////////

	view.events = function() {

		// Add new color field to group
		view.on("add-color", add_color);

		// Add new color groups
		view.on("add-group", add_group);

		// Change color field
		view.on("change-color", change_color);
	}


	////////////////////////////////////////
	//                                    //
	//                Init                //
	//                                    //
	////////////////////////////////////////

	view.init = function(image_data) {
		var canvas_id = "color-picker";
		var image = new Image();
		image.onload = function(){ // always fires the event.

			// Add image to canvas
			var canvas = set_canvas_image(canvas_id, image_data().crop, image);

			// Make pattern size fields update
			set_size_listeners(canvas.width / canvas.height);

			// Fade in color picker
			$("#colors").fadeIn();
		}
		image.src = image_data().src;
	}


	////////////////////////////////////////
	//                                    //
	//             Functions              //
	//                                    //
	////////////////////////////////////////


	// Add listeners to the pattern size input boxes so the ratio is maintained
	var set_size_listeners = function(size_ratio) {
		view.set("size.ratio", size_ratio);
		view.observe("size.height", function(new_val, old_val) {
			view.set("size.width", Math.round(new_val * view.get("size.ratio")));
		});
		view.observe("size.width", function(new_val, old_val) {
			view.set("size.height", Math.round(new_val / view.get("size.ratio")));
		});
	}



	// Add image to canvas corresponding to the crop made in the crop section
	var set_canvas_image = function(canvas_id, crop, image) {
		// Set canvas image
		var canvas = document.getElementById(canvas_id);
		canvas.width = Math.min($(".col-md-6").width(), crop.w);
		canvas.height = Math.ceil((canvas.width / crop.w) * crop.h);
		canvas.getContext('2d').drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);

		// Return canvas
		return canvas;
	}


	// Create a color event on the body every time the mouse moves over the canvas
	var get_canvas_color = function(canvas, e) {

		// Helper function (Refactor with underscore at some point)
		function find_pos(obj) {
			var current_left = 0, current_top = 0;
			if (obj.offsetParent) {
				do {
					current_left += obj.offsetLeft;
					current_top += obj.offsetTop;
				} while (obj = obj.offsetParent);
				return { x: current_left, y: current_top };
			}
			return undefined;
		}

		// For each time the mouse moves over the canvas, record the color
		var position = find_pos(canvas);
		var x = e.pageX - position.x;
		var y = e.pageY - position.y;
		var coordinate = "x=" + x + ", y=" + y;
		var context = canvas.getContext('2d');
		var p = context.getImageData(x, y, 1, 1).data;

		return {
			r : p[0],
			g : p[1],
			b : p[2]
		}
	}


	// Add new color to group
	var add_color = function(event_data) {
		// Init new color
		var new_color = {
			r : 250,
			g : 250,
			b : 250
		}

		// Add to view
		var colors = view.get(event_data.keypath + ".colors");
		colors.push(new_color);
		$("#change-color li").last().trigger("click")
	}


	// Add new group
	var add_group = function(event_data) {
		// Init new group
		var new_group = {
			colors : [{
				r : 250,
				g : 250,
				b : 250
			}]
		}

		var groups = view.get("groups");
		groups.push(new_group);
	}


	// Change existing color
	var change_color = function(event_data) {
		var field = $(event_data.node);
		var canvas = document.getElementById("color-picker");

		// Add style to field
		field.css("box-shadow", "0 0 10px #9ecaed");

		// Set color listener
		var listener = $(canvas).on("mousemove", function(e) {
			// get color
			var color = get_canvas_color(canvas, e);

			// Update view
			view.set(event_data.keypath, color);
		});


		// When we click, toggle the color
		$(canvas).on("click", function(e) {

			$(canvas).off("mousemove");

			// Set border to normal
			field.css("box-shadow", "none");

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
