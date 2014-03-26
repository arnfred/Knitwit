define(["lib/jquery", "lib/underscore", "js/css", "text!templates/pattern.html", "lib/Ractive.min", "lib/color/spectrum", "lib/Ractive-events-tap", "lib/Ractive-transitions-fade"],
	function($, _, css, pattern_template, R) {

	////////////////////////////////////////
	//                                    //
	//            Ractor View             //
	//                                    //
	////////////////////////////////////////

	var view = new R({
		template : pattern_template,
		el : "pattern",
		data : {
			colors : [{ 
				r : 20,
				g : 20,
				b : 20
			}],
			pattern : [{
				row : []
			}],
			header : []
		}
	});


	////////////////////////////////////////
	//                                    //
	//               Events               //
	//                                    //
	////////////////////////////////////////

	view.events = function() {
		// Correct color when user clicks on pattern
		view.on("correct-color", correct_color);

		// Set color with color picker
		$("#pattern-colors li").each(add_color_picker);	
	}

	////////////////////////////////////////
	//                                    //
	//                Init                //
	//                                    //
	////////////////////////////////////////

	view.init = function(encoded_pattern) {

		// Decode pattern
		var pattern = decode(encoded_pattern.data);

		// Set header
		var header = _.range(pattern[0].row.length);

		// Display json
		view.set("header", header);
		view.set("pattern", pattern);

		// Add css rules
		_(view.get("colors")).each(function (color, index) {
			var rgb = "rgb(" + color.r + "," + color.g + "," + color.b + ")";
			css.add("td.color" + index, "background-color: " + rgb);
		});

		// Replace gif of spinning wheel with PNG (or stop it)
		// TODO

		// Capture events
		view.events()
	}

	////////////////////////////////////////
	//                                    //
	//             Functions              //
	//                                    //
	////////////////////////////////////////



	// Take matrix where each row is run-length encoded and decode it
	var decode = function(data) {

		// runlength decode a row
		function row_decode(row) {
			// Using jquery map since it's practically a flatmap
			return { row : $.map(row, elem_decode) };
		}

		// Create list containing 'elem[0]' copies of 'elem[1]'
		function elem_decode(elem) {
			return (Array.apply(0, Array(elem[0]))).map(function() { 
				return elem[1]; 
			});
		}

		// Decode all data
		return data.map(row_decode);
	}


	// Cycles through the colors of the pattern
	var correct_color = function(e) {
		var current = e.context;
		var nb_colors = view.get("colors").length;
		view.set(e.keypath, (current + 1) % nb_colors);
	}


	var add_color_picker = function(index, elem) {

		var set_color = function(color) {
			$(elem).css("background-color", color.toHexString());
		}

		var update_table = function(color, i) {
			css.change("td.color" + i, "background-color: " + color.toHexString());
		}

		var bg = $(elem).css("background-color");

		$(elem).spectrum({
			color: bg,
			change: function(color) { update_table(color, index) },
			move: set_color,
			show: set_color,
			hide: set_color
		});
	}

	// Enables a color picker
	var set_color = function(e) {
		var c = e.context;
		console.debug(c);
		console.debug(e);
		var bg = "rgb(" + c.r + ", " + c.g + ", " + c.b + ")";
		console.debug($(e.node));
		$(e.node).spectrum("show", {
				color: bg,
				//change: function(color) { update_table(color, index) },
				//move: set_color,
				//show: set_color,
				//hide: set_color
			});
		}
	



	////////////////////////////////////////
	//                                    //
	//               Return               //
	//                                    //
	////////////////////////////////////////

	return view;

});

