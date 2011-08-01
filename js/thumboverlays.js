// Using the closure to map jQuery to $. 
(function ($) {

var VIDEOS_FIELD_NAME = "field-wall-videos";
var IMAGES_FIELD_NAME = "field-wall-images";


/*************************************************/

 
  // If a video and thumbnail share a filename, then flag them with classes
  
/***
*  Our current use-case for a project is that a video has to have an associaed thumbnail.
*  Until better options present themselves, we'll be using filenames to identify whether an uploaded
*  image is a thumbnail for a video based on identical (excluding extension) filenames.
*  The "overlay" aspect of this module is largely absent.  No images are being overlaid anymore
*  after a module change.
*
****/
  
  
Drupal.behaviors.detectRelated = {
      attach: function (context, settings) {  
         //endlessMatchChecks(context, settings);
         var prepend = settings.thumboverlays.prepend;
         var videoSelector = settings.thumboverlays.videoSelector;
         var imageSelector = settings.thumboverlays.imageSelector;
         
         var videofield = $(prepend+VIDEOS_FIELD_NAME, context);
         var imagefield = $(prepend+IMAGES_FIELD_NAME, context);
         
         var videos = $(videoSelector, videofield);
         var images = $(imageSelector, imagefield);
         unFlagFiles(videos, images);
         flagMatchedFiles(videos, images);         
      }  
  };
  
   //A little sloppy but this does the trick.  Media module fails to trigger drupal behaviors
   //like other dynamically added form elements.  (see below)
   
   //UPDATE: We switched to just using the File and Image modules, both of which have the expected
   // Drupal.attach behaviors when updating the DOM.  No more messy setInterval repeats
   
//   setInterval(Drupal.behaviors.detectRelated.attach, 500);  


/***
*  Go through each videos object and images object and get rid of our styles and any overlay divs
*  we've made.  
***/
function unFlagFiles(videos, images) {
   $.each(videos, function(key, video) {
      //unstyleVideoThumb(video, "matched");
      clearThumbOverlay(video);
      clearThumbOverlay(video, "thumbnail-matched");
      clearThumbOverlay(video, "thumbnail-missing");
      //removes the helper text
      clearThumbOverlay(video, "thumbnail-text-warning");
   });
      
   $.each(images, function(key, image) {
      unstyleVideoThumb(image, "matched");
   });
} 

/****
*  Function is a little messy because it has gone through a few different goals.  
*  Currently:  If a video has the same name as an image, overlay that image as a thumbnail on
*  the video.
*     Also, if a video has no matching thumbnail image then flag it with an error (display a "missing
*     thumbnail" image and some helper text to explain that no thumbnail was found.)
*
****/

function flagMatchedFiles(videos, images) {
   //assumes videos are a label, images are an img tag (for media module)
   var tagVideos = new Array();
   //var tagImages = new Array();
   var vidThumbs = new Array();
   var thumbs = new Array();
   var matchFound = false;
   
   //Walk through the video array, checking the image array for each video before moving
   // to the next vid
   $.each(videos, function(key, video) {
      var videoname = extractVidName(video);
      //search for related image
      $.each(images, function(ikey, image) {
         var imagename = extractImgName(image);
         if (videoname == imagename) {
//            tagVideos.push(video);
//            tagImages.push(image);
            vidThumbs.push(video);
            //The actual thumbnail is in front of this image element.
            var actualThumb = getThumbnail(image);
            thumbs.push(actualThumb);
            matchFound = true;
         }
      }); 
      //end search for related image
      
      if (!matchFound) 
         tagVideos.push(video);
      matchFound = false;  //reset flag
   });
   //This loop is used to keep track of vids that need to be marked as error
   for (x in tagVideos) {
//      styleVideoThumb(tagVideos[x], "matched");
      addThumbOverlay(tagVideos[x], "notfound.png", "thumbnail-missing");
      // add warning text
      $(tagVideos[x]).children('a').after('<div class="thumbnail-text-warning">(No thumbnail image found)</div>');
   }
   //This loop isn't used, but would mark a thumbnail image that matched a video
/*   for (x in tagImages) {
      styleImageThumb(tagImages[x], "matched");
   } */
   
   //This loop is used to add thumbnail overlays to videos with matching image thumbnails
   for (x in vidThumbs) {
      var temp = thumbs[x];
      //switch image preset for smaller thumbnail
      var path = temp.src;
      if(Drupal.settings.thumboverlays.editform) {
         //There is a likliehood that a thumb and a vid get added at the same time.
         // In this case, there won't be any video_thumb path for the new image yet.
         path = temp.src;
      }      
      else path = path.replace("wall_preview","video_thumb");
      addThumbOverlay(vidThumbs[x], path, "thumbnail-matched");
   }
   
}

function getThumbnail(image) {
   //find the thumbnail of this given image.
   //This can vary greatly depending on our module usage.
   if (Drupal.settings.thumboverlays.editform) {
      var previewImage = $(image).parent().siblings('.image-preview');
      return $('img', previewImage)[0];
   }
   else return image;
}

/*<img src="http://downstreamdev.net/ch2mhill/sites/default/files/styles/video_thumb/public/the-wall/images/Our%20People.png"> */
/*<img src="http://downstreamdev.net/ch2mhill/sites/default/files/styles/thumbnail/public/the-wall/images/Our%20People.png"> */


/***
** Returns strings
**
**/
function extractVidName(video) {
   var tempname = $('a', video).text();
   tempname = tempname.replace(/%20/,' ');
   return tempname.substr(0, tempname.lastIndexOf('.'));
}

// This makes some assumptions about filenames and needs some clarification in design
function extractImgName(image) {
   var imagename = null;
   if (Drupal.settings.thumboverlays.editform) {
      imagename = $('a', image).text();    
   }
   else {
      imagename = image.src.replace(/.*\//,'');   //trims out everything before and including the last slash"
      imagename = imagename.replace(/_\d*/, '');
   }   
   //replace bothersome %20 with spaces
   imagename = imagename.replace(/%20/,' ');     
   return imagename.substr(0, imagename.lastIndexOf('.'));
}


/***
*  Thumbnail overlay functions.  Not a lot to document here.
*  This depends on the specific module we're using to work.
*
***/
function addThumbOverlay(div,overlayImage, classname) {
   var prepend = '';
   //An image might be a complete URL, so we need to account for this.
   //Doesn't currently account for other URL information and makes assumptions about module paths
   if (overlayImage.search(/^http/) < 0) {
      prepend = Drupal.settings.basePath+Drupal.settings.thumboverlays.path;
   }
   //Special handling because 
   //if (classname = "thumbnail-matched")
   $(div).prepend('<div class="'+classname+'"><img src="'+prepend+overlayImage+'" /></div>');
}

function clearThumbOverlay(div, classname) {
   if (typeof(classname) == "undefined")
      classname = '.image-matched';
   $(div).children('.'+classname).remove();
}


function styleVideoThumb(video, classname) {
   $(video).parents('.media-item').addClass(classname);
}

function styleImageThumb(image, classname) {
   $(image).parents('.media-item').addClass(classname);
}

function unstyleVideoThumb(video, classname) {
   $(video).parents('.media-item').removeClass(classname);
}

function unstyleImageThumb(image, classname) {
   $(image).parents('.media-item').removeClass(classname);
}
  
}(jQuery));