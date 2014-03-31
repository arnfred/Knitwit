define(["lib/underscore"], function(_) {

	var css = {};

	////////////////////////////////////////
	//                                    //
	//                Init                //
	//                                    //
	////////////////////////////////////////

	css.init = function() {

		// Load all css data
		css._data = css_rules();
		css._default_sheet = document.styleSheets[0];

	}


	// Retreive a css rule
	css.get = function(name) {
		return css._data[name];
	}

	// Add rule to css
	css.add = function(name, style) {
		var sheet = css._default_sheet;
		if (sheet.insertRule) { // firefox
			sheet.insertRule(name + " { " + style + "; }", sheet.cssRules.length);
		}
		else {
			sheet.addRule(name, style , 1);
		}
		rescan();
	}

	// Remove rule. If only_last_p is true then we only remove the last rule.
	// only_last_p is false per default
	css.remove = function(name, only_last_p) {
		// Find what sheet and what rule number we need to delete
		var fields = css.get(name);
		// if name doesn't exist, throw error
		if (fields == undefined) throw new Error("No style with name: " + name);
		// If we only delete one item, modify fields 
		if (only_last_p) { fields = [_(fields).last()]; }
		// Now remove all fields left in the list
		_(fields).each(function(f) {
			var sheet = document.styleSheets[f.sheet];
			sheet.deleteRule(f.key);
		});

		// Rescan to update table (horribly inefficient)
		rescan();
	}

	// Change a rule from something to something else
	css.change = function(name, style) {
		css.remove(name);
		css.add(name, style);
	}
	
	////////////////////////////////////////
	//                                    //
	//             Functions              //
	//                                    //
	////////////////////////////////////////
	

	var rescan = function() {
		// Load all css data
		css._data = css_rules();
	}


	// Organize all css rules in a simple fashion
	var css_rules = function() {

		// Find all css rules
		var rules = _.chain(document.styleSheets)
			.map(function(sheet, sheet_key) { 
				var rule_list = sheet.cssRules || sheet.rules;
				var rules = _(rule_list).map(function(v,k) {
					return { 'key' : k, 'value' : v, 'sheet' : sheet_key };
				});
			 return _(rules).values();
			})
			.flatten(true) // shallow, i.e the array is only flattened once
			.groupBy(function(v) { return v.value.selectorText; })
			.value();

		return rules
	}

	css.init();
	return css
});
