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
			name : "Your Pattern",
			colors : [{
				r : 20,
				g : 20,
				b : 20,
				index : 0
			}],
			pattern : [{
				row : []
			}],
			header : [],
			merge : false,
			save : {
				name : "My Pattern",
			},
			saved : false
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

		// Clear fields
		view.on("clear-field", clear_field);

		// Save pattern
		view.on("save-pattern", save_pattern);
	}

	////////////////////////////////////////
	//                                    //
	//                Init                //
	//                                    //
	////////////////////////////////////////

	view.init = function(encoded_pattern, colors) {

		// Decode pattern
		var pattern = decode(encoded_pattern.data);

		// Create pattern
		view.create_pattern(pattern, colors);

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
	 * Add indices to a list of colors and add to view.
	 * The indices are needed when we cycle through colors.
	 */
	view.set_colors = function(colors) {
		var cs = _(colors).each(function(c, i) { c.index = i; });
		view.set("colors", cs);
	}



	/*
	 * Generate pattern based on pattern
	 */
	view.create_pattern = function(pattern, colors) {

		// Set header
		var header = _.range(pattern[0].row.length);

		// Display json
		view.set("header", header);
		view.set("pattern", pattern);

		// Add css rules
		_(colors).each(function (color, index) {
			var rgb = "rgb(" + color.r + "," + color.g + "," + color.b + ")";
			css.add("td.color" + index, "background-color: " + rgb);
		});

		// Set colors
		view.set_colors(colors);

	}


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


	// Clear text fields
	var clear_field = function(e) {
		if (e.context.name == "My Pattern") {
			$(e.node).val("")
		}
	}



	// This function takes a matrix containing only, say, 1's, 3's and 5's and
	// renames all 1's to 0's, all 3's to 1's and all 5's to 2's
	var compress_pattern = function(pattern) {

		// Construct object with the keys being every unique value in pattern
		// and the corresponding values the index of the value's position in a
		// sorted list of all values
		var uniques = _.object(_(pattern).chain()
										 .pluck("row")
										 .flatten()
										 .uniq()
										 .sort()
										 .map(function(n,i) { return [n,i] })
										 .value());

		// For each element in the pattern, replace it according the the
		// 'uniques' map
		var p = _(pattern).clone();
		_(p).each(function (row, index) {
			var new_row = {
				row : _(row.row).map(function(elem) {
					return uniques[elem];
				})
			}
			p[index] = new_row
		});

		return p;
	}



	// Save pattern
	var save_pattern = function(e) {
		var pattern = compress_pattern(view.get("pattern"));
		// get params
		var params = {
			pattern : JSON.stringify(pattern),
			name : view.get("save.name"),
			colors : JSON.stringify(view.get("colors"))
		};

		// Send json to get result
		$.post("/save/", params, function(url_data) {
			view.set("save", false);
			view.set("saved", { href : "/p/" + url_data.id, name : params.name });
            // Change location
            window.location = "/p/" + url_data.id;
		}, "json");
	}



	/*
	 * The color clicked is merged with the selected color
	 */
	var merge_colors = function(e) {
		// Check if we unselect
		if (e.node == view.get("merge").node)
			return reset_merge();

		// If not, remove last clicked on color
		var selected_index = get_index(view.get("merge"));
		var merged_index = get_index(e);
		var colors = view.get("colors");
		colors.splice(merged_index, 1);

		// Update each row in the pattern
		var pattern = view.get("pattern");
		_(pattern).each(function(row, index) {
			var new_row = _(row.row).map(function(elem) {
				if (elem === merged_index) return selected_index;
				else return elem;
			})
			pattern[index] = { row : new_row }
		});
		view.update("pattern");

		// Remove last Events
		reset_merge();
	}


	// Returns the original index of the color clicked on given an event
	// corresponding to the click
	var get_index = function(e) {
		var parts = e.keypath.split(".");
		var color_nb = parseInt(parts[parts.length - 1]);
		var colors = view.get("colors");
		return colors[color_nb].index;
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
		var colors = view.get("colors")
		var indices = _(colors).map(function(c, i) { return c.index });
		var color_index = (indices.indexOf(current) + 1) % colors.length
		var new_color = colors[color_index].index;

		view.set(e.keypath, new_color);
	}


	var add_color_picker = function(index, elem) {


		var set_color = function(color) {

			var indices = _.object(
				_(view.get("colors")).chain().pluck("index").map(function(n, i) {
					return [n, i];
				}).value());
			var array_index = indices[index];

			var rgb = color.toRgb();
			view.set("colors." + array_index, {
				r : rgb.r,
				g : rgb.g,
				b : rgb.b,
				index : index
			})
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


	////////////////////////////////////////
	//                                    //
	//               Return               //
	//                                    //
	////////////////////////////////////////

	return view;

});

