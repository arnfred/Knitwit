define(["js/pattern", "lib/Ractive.min", "lib/Ractive-events-tap"], 
	function (pattern, R) {


	var controller = {}


	////////////////////////////////////////
	//                                    //
	//                Init                //
	//                                    //
	////////////////////////////////////////

	controller.init = function(data) {
		// Create pattern
		pattern.create_pattern(data.pattern, data.colors);
		pattern.set("save.name", data.name);
		pattern.set("name", data.name);
		pattern.events();
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

	//controller.events();
	return controller;

});

