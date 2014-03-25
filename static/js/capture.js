// From https://developer.mozilla.org/en-US/docs/WebRTC/Taking_webcam_photos
define([], function() {

	return function(video_id, canvas_id, width) {

	  var streaming = false,
		  video        = document.querySelector(video_id),
		  canvas       = document.querySelector(canvas_id),
		  //photo        = document.querySelector('#thumb'),
		  //startbutton  = document.querySelector('#startbutton'),
		  //width = 320,
		  height = 0;

	  navigator.getMedia = ( navigator.getUserMedia ||
							 navigator.webkitGetUserMedia ||
							 navigator.mozGetUserMedia ||
							 navigator.msGetUserMedia);

	  navigator.getMedia(
		{
		  video: true,
		  audio: false
		},
		function(stream) {
		  if (navigator.mozGetUserMedia) {
			video.mozSrcObject = stream;
		  } else {
			var vendorURL = window.URL || window.webkitURL;
			video.src = vendorURL.createObjectURL(stream);
		  }
		  video.play();
		},
		function(err) {
		  console.log("An error occured! " + err);
		}
	  );

	  video.addEventListener('canplay', function(ev){
		if (!streaming) {
		  height = video.videoHeight / (video.videoWidth/width);
		  video.setAttribute('width', width);
		  video.setAttribute('height', height);
		  canvas.setAttribute('width', width);
		  canvas.setAttribute('height', height);
		  streaming = true;
		}
	  }, false);

	  var take_picture = function() {
		canvas.width = width;
		canvas.height = height;
		canvas.getContext('2d').drawImage(video, 0, 0, width, height);
		return canvas.toDataURL('image/png');
		//photo.setAttribute('src', data);
	  }

	  return take_picture;
	  //startbutton.addEventListener('click', function(ev){
	  //    takepicture();
	  //  ev.preventDefault();
	  //}, false);

	}

});
