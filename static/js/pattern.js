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
			header : [],
			merge : false
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
		$("#pattern-colors li div").each(add_color_picker);	

		// Change all other colors to merge with set-merge
		view.on("set-merge", function(e) {
			if (view.get("merge") == false) init_merge(e);
			else merge_colors(e);
			return false;
		});
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

		// Fade in pattern
		$("#pattern").fadeIn();

		// Capture events
		view.events()
	}

	////////////////////////////////////////
	//                                    //
	//             Functions              //
	//                                    //
	////////////////////////////////////////


	/*
	 * Labels are changed to allow for merge
	 */
	var init_merge = function(e) {

		// Change all other fields to merge
		$("p.select").html("Merge").addClass("merge");
		$(e.node).html("Deselect").addClass("selected");

		// update view
		view.set("merge", e);
	}


	/*
	 * The color clicked is merged with the selected color
	 */
	var merge_colors = function(e) {
		// Check if we unselect
		if (e.node == view.get("merge").node) 
			return reset_merge();

		// If not, remove last clicked on color
		var old_index = get_index(view.get("merge"));
		var new_index = get_index(e);
		var colors = view.get("colors");
		colors.splice(new_index, 1);

		// Update colors on Table
		$(".color" + new_index).addClass("color" + old_index);
		$(".color" + new_index).removeClass("color" + new_index);

		// Remove last Events
		reset_merge();
	}


	var get_index = function(e) {
		var parts = e.keypath.split(".");
		return parseInt(parts[parts.length - 1]);
	}


	/*
	 * Turns selecters back to how they are initially
	 */
	var reset_merge = function() {
		
		// Change all other fields to merge
		$("p.select").html("Select").removeClass("merge").removeClass("selected");

		// Remove last Events
		view.set("merge", false);
	}


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
		var bg = "rgb(" + c.r + ", " + c.g + ", " + c.b + ")";
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

