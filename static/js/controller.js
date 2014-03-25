define(["lib/jquery", "lib/underscore", "js/upload", "js/colors", "js/pattern", "lib/Ractive.min", "lib/Ractive-events-tap"], 
	function ($, _, upload, colors, pattern, R) {


	var controller = {}


	////////////////////////////////////////
	//                                    //
	//               Events               //
	//                                    //
	////////////////////////////////////////

	controller.events = function() {

		// Upload -> Colors
		// Make color picker correspond with crop size
		upload.observe("preview.crop", function(new_val, old_val) {
			var preview_image = upload.get("preview");
			// Show color picker
			colors.init(preview_image);
		});


		// Colors -> Pattern
		// Generate pattern when we click
		colors.on("generate-pattern", function() {
			// Collect data
			var params = collect_params();
			// Set colors
			pattern.set("colors", colors.get("colors"));

			// Replace PNG with gif of spinning gear
			// TODO
			
			// Send JSON
			$.getJSON("/pattern.json", params, pattern.init);
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
			stitches : JSON.stringify(colors.get("size")),
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

