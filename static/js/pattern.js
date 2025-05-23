define(["lib/jquery", "lib/underscore", "text!templates/pattern.html", "ractive", "lib/color/spectrum", "ractive_tap", "ractive_fade"],
	function($, _, pattern_template, R) {

	////////////////////////////////////////
	//                                    //
	//            Ractor View             //
	//                                    //
	////////////////////////////////////////

    /*
     * Converts color to rgb string
     */
    var toRGB = function(color, show_symbols) {
        if (show_symbols) {
            return "rgb(" + brighten(color.r) + "," + brighten(color.g) + "," + brighten(color.b) + ")";
        }
        return "rgb(" + color.r + "," + color.g + "," + color.b + ")";
    }

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
            gauge : false,
			pattern : [{
				row : []
			}],
            pixel_size : 10,
			header : [],
			merge : false,
			save : {
				name : "My Pattern",
			},
			saved : false,
            font : {
                size : 6
            },
            rgb : toRGB,
            show_symbols : false,
            show_pattern : false,
            show_credits : false,
            symbols : ["X", "#", "+", "·", "¬", "@", "?", "$", "V", "§", "Ø", "U", "W", "G", "Y", "D", "Z", "<", ">", "{", "}", "8", "7", "6", "5", "4", "3", "2", "9"]
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

        // Change to symbols when click on symbols button
        view.off("symbols-toggle")
        view.on("symbols-toggle", symbols_toggle);

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

		// Save pattern
		$('#download-pattern').off('click').on('click', download);
	}

	////////////////////////////////////////
	//                                    //
	//                Init                //
	//                                    //
	////////////////////////////////////////

	view.init = function(pattern, colors, gauge, width) {

        // Set pattern size
        view.set_pattern_size(width, gauge);

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

		// Set colors
		view.set_colors(colors);

		// Set header
		var header = _.range(pattern[0].row.length);

		// Display json
		view.set("header", header);
		view.set("pattern", pattern);

        // Disable symbols
        view.set("show_symbols", false);

        // Show pattern
        view.set("show_pattern", true);

	}


    /*
     * Set pattern table size
     */
    view.set_pattern_size = function(pattern_width, gauge) {
        // Set gauge in data
        view.set("gauge", gauge);

        // Get set unit width
        var ratio = (gauge.x / gauge.y);
        var page_width = $(".col-md-9").width();
        if (page_width <= 100) {
            var page_width = Math.floor($(".col-md-6").width() * 3 / 2);
        }
        var t = "px";
        var min_width = 11;
        var max_width = 22;
        var unit = (1.0 / (pattern_width + 2)) * (page_width);

        // Test if unit is smaller than a certain size
        if (unit < min_width) {
            unit = min_width;
        }
        else if (unit > max_width) {
            unit = max_width;
        }

        if (ratio > 1) {
            // Find height
            var width = unit;
            var height = (gauge.x / gauge.y) * width;
        } else {
            // Find height
            var width = unit;
            //var width = (gauge.y / gauge.x) * height;
            var height = width / (gauge.y / gauge.x);
        }

        view.set("width", Math.round(width));
        view.set("height", Math.round(height));
        view.set("font.size", width * (6/11))
    }


    /*
     * Take color and brighten it
     */
    var brighten = function(c) {
        return parseInt((c + 3*255.0) / 4.0);
    };

    /*
     * Change pattern to colors
     */
    var toggle_colors = function() {
		// Add rules
		_(view.get("colors")).each(function (color, i) {
			var rgb = "rgb(" + (color.r) + "," + (color.g) + "," + (color.b) + ")";
			//css.change("rect.color" + color.index, "fill: " + rgb);
		});
    }


	/*
	 * Labels are changed to allow for merge
	 */
	var init_merge = function(e) {

		// Change all other fields to merge
		$("ul#pattern-colors p.select").html("Merge").addClass("merge");
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
            gauge : JSON.stringify(view.get("gauge")),
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

		// If not, remove first clicked on color
		var selected_index = get_index(e);
		var merged_index = get_index(view.get("merge"));
        var merged_position = get_position(view.get("merge"));
		var colors = view.get("colors");
		colors.splice(merged_position, 1);

		// Update each row in the pattern
		var pattern = view.get("pattern");
		_(pattern).each(function(row, index) {
			var new_row = _(row.row).map(function(elem) {
				if (elem === merged_index) return selected_index;
				else return elem;
			});
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

    // Returns the position of event in array, i.e 'colors.0' returns 0
    var get_position = function(e) {
        return parseInt(_(e.keypath.split(".")).last())
    }


	/*
	 * Turns selecters back to how they are initially
	 */
	var reset_merge = function() {

		// Change all other fields to merge
		$("ul#pattern-colors p.select").html("Select").removeClass("merge").removeClass("selected");

		// Remove last Events
		view.set("merge", false);
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

		var bg = $(elem).css("background-color");

		$(elem).spectrum({
			color: bg,
			move: set_color,
			show: set_color,
			hide: set_color
		});
	}

    /*
     * Toggle the symbols on and off
     */
    var symbols_toggle = function() {
        view.set("show_symbols", !view.get("show_symbols"));
    }


    /*
     * Download image
     * Inspired by: http://techslides.com/save-svg-as-an-image/
     */
    var download = function(e) {
        // Enable credits
        view.set("show_credits", true)
        var svg = document.querySelector("svg")
        var html = document.querySelector("svg").outerHTML
        var imgsrc = 'data:image/svg+xml;base64,'+ btoa(html);

        var canvas = document.getElementById("svg-download")
        canvas.setAttribute('width', svg.getAttribute("width"));
        canvas.setAttribute('height', svg.getAttribute("height"));
        context = canvas.getContext("2d");

        var image = new Image();
        image.onload = _.once(function() {
            context.drawImage(image, 0, 0);

            var canvasdata = canvas.toDataURL("image/png");

            var pngimg = '<img src="'+canvasdata+'">';
            //d3.select("#pngdataurl").html(pngimg);

            var a = document.createElement("a");
            var view_name = view.get("name")
            var name = view_name == "Your Pattern" ? "" : "_" + view_name;
            var file_name = name.replace(" ","_").toLowerCase();
            a.download = "knitwit" + file_name + ".png";
            a.href = canvasdata;
            var clickEvent = new MouseEvent("click", {
                "view": window,
                "bubbles": true,
                "cancelable": false
            });
            a.dispatchEvent(clickEvent);
            //$(a).click();
        });
        image.src = imgsrc;
        view.set("show_credits", false)
    }


	////////////////////////////////////////
	//                                    //
	//               Return               //
	//                                    //
	////////////////////////////////////////

	return view;

});

