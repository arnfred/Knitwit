define(["lib/jquery", "lib/underscore", "js/upload", "js/colors", "js/pattern", "ractive", "ractive_tap"],
	function ($, _, upload, colors, pattern, R) {


	var controller = {}

	////////////////////////////////////////
	//                                    //
	//                Init                //
	//                                    //
	////////////////////////////////////////

	controller.init = function() {
        colors.init(function () { return colors.get("placeholder") });
        upload.show_preview(colors.get("placeholder.src"))
    }

	////////////////////////////////////////
	//                                    //
	//               Events               //
	//                                    //
	////////////////////////////////////////

	controller.events = function() {

		// Upload -> Colors
		// Make color picker correspond with crop size
		upload.observe("preview.crop", function(new_val, old_val) {
            if (new_val == undefined) return
			var preview_image_fun = function() { return upload.get("preview"); };
			// Show color picker
			colors.init(preview_image_fun);
		});


		// Colors -> Pattern
		// Generate pattern when we click
		$('#generate-pattern').on('click', function () {
			// Get colors
			const pattern_colors = colors.get("colors").slice(0);
			const gauge = colors.get("size.gauge");
			const width = colors.get("size.width");

			// Collect data
			const params = collect_params();

			// Replace PNG with gif of spinning gear
			const image = new Image();
			const path = "/static/images/generate.gif";

			image.onload = function () { // always fires the event.
				colors.set('generate.src', path);
				// Send JSON
				$.getJSON("/pattern.json", params, function (data) {
					pattern.init(data.data, pattern_colors, gauge, width);
					colors.set('generate.src', "/static/images/generate.png");
				});
			};
			image.src = path;
		});
	}



	////////////////////////////////////////
	//                                    //
	//              Functions             //
	//                                    //
	////////////////////////////////////////

	var collect_params = function() {
		return {
			colors : JSON.stringify(colors.get("colors")),
			width : JSON.stringify(colors.get("size.width")),
            gauge : JSON.stringify(colors.get("size.gauge")),
			crop : JSON.stringify(upload.get("preview.crop")),
			image : upload.get("preview.src")
		}
	}


	////////////////////////////////////////
	//                                    //
	//               Return               //
	//                                    //
	////////////////////////////////////////

	controller.events();
	return controller;

});

