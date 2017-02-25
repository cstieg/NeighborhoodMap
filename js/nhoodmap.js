/*
 * Uses Knockout.js, which has MVVM structure:
 *  Model - stored data
 *  ViewModel - the data and functions
 *  View - the HTML with bindings to VM data and functions
 */
var viewModel = {
  // Initializes data in Knockout observables, which automatically refreshes html
  // Data is persisted to localStorage by knockout.localStorage.js
  init: function() {
    this.address = ko.observable(null, {persist: 'address'});
    this.locationCoords = ko.observable(null, {persist: 'locationCoords'});
    this.map = ko.observable();
    this.markers = ko.observableArray(null, {persist: 'markers'});
    // simple js arrays to collect google maps objects for later access
    this.gMapMarkers = [];
    this.infoWindow = null;
  },


  //============================MAIN MAP=====================================//
  // Takes an address from the user and uses Google Maps API to convert it to a
  // latitutude/longitude location
  inputAddress: function(formData) {
    this.address(formData.address.value);

    var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + this.address();
    $.ajax({
      url: url,
      context: this,
      success: function(result) {
        // on success inputting address, display map centered on lat/long of address
        this.locationCoords(result.results[0].geometry.location);
        this.displayMap(this.locationCoords());
      }
    });
  },

  // displays a map centered at a given location with a marker on that location
  displayMap: function(location = viewModel.locationCoords()) {
    if (!location) { return; }
    var mapElement = document.getElementById('map');
    var map = new google.maps.Map(mapElement, {
      zoom: 16,
      center: location
    });
    var marker = new google.maps.Marker({
      position: location,
      map: map,
      animation: google.maps.Animation.DROP
    });
    // rightclick adds a user-defined marker
    map.addListener('rightclick', this.addMarker);
    this.map(map);
    this.displayMarkers();
  },


  //==============================MARKERS=====================================//

  // displays all markers based on stored marker locations
  displayMarkers: function() {
    var vm = this;
    vm.markers().forEach(function(marker) {
      var gMapMarker = vm.showMarker(marker, vm.map());
      viewModel.gMapMarkers.push(gMapMarker);
    });
  },

  // adds a marker from a click event
  addMarker: function(result) {
    var markerLocation = {
      lat: result.latLng.lat(),
      lng: result.latLng.lng()
    };

    // reverse geocode to find address
    var geocoder = new google.maps.Geocoder;
    geocoder.geocode({'location': markerLocation}, function(results, status) {
      if (status === 'OK') {
        if (results[0]) {
          // on success, store the data
          var newMarker = {
            markerID: generateID(),
            position: markerLocation,
            address: results[0].formatted_address,
          };
          if (!newMarker.placeName) {
            newMarker.placeName = '';
          }
          // need to keep marker data separate from Google Maps' marker object,
          // as persisting google objects causes error
          var gMapMarker = viewModel.showMarker(newMarker, viewModel.map());
          viewModel.gMapMarkers.push(gMapMarker);
          viewModel.markers.push(newMarker);
          viewModel.renderInfoWindow(newMarker, "edit");
        } else {
          window.alert('No results found');
        }
      } else {
        window.alert('Geocoder failed due to: ' + status);
      }
    });
  },

  // displays a marker on the map, returns reference to Google Maps' marker object
  showMarker: function(marker, map) {
    var gMapMarker = new google.maps.Marker(objCpy(marker));
    gMapMarker.setMap(map);
    gMapMarker.addListener('click', viewModel.showMarkerInfo);
    return gMapMarker;
  },


//=================MARKER INFOWINDOW INTERACTION=============================//

  // display infoWindow at a given marker
  renderInfoWindow: function(marker, action) {
    if (viewModel.infoWindow) {
      viewModel.infoWindow.close();
      viewModel.infoWindow = null;
    }
    if (!marker) { return; }
    var markerID = marker.markerID;
    var matchMarkerID = function(object) {
      return (object.markerID == markerID);
    };
    var gMapMarker = viewModel.gMapMarkers.find(matchMarkerID);
    gMapMarker.placeName = marker.placeName;
    var infoWindow = new google.maps.InfoWindow({
      content: viewModel.markerInfoWindowContent(gMapMarker, action)
    });
    // store infoWindow (only one open at a time) in variable to make sure it stays alive
    viewModel.infoWindow = infoWindow;
    infoWindow.open(viewModel.map(), gMapMarker);
  },

  // return the form html for infoWindow at marker
  markerInfoWindowContent: function(marker, action) {
    var content = `<form>`;
    if (action == "edit") {
      if (marker.placeName) {
        content += `<input type="text" name="name" value="${marker.placeName}"><br>`;
      }
      else {
        content += `<input type="text" name="name" placeholder="Input name for this location"><br>`;
      }
    }
    else {
      content += `<p>${marker.placeName}</p>`;
    }
    content += `
        <p>${marker.address}</p>
        <p>${marker.position}</p>
        <p class="markerID" style="display: none">${marker.markerID}</p>
        `;
    if (action == "edit") {
        content += `<button type="submit" name="save" onclick="return viewModel.saveMarkerInfo(event)">Save</button>`;
    }
    else {
        content += `<button type="submit" name="edit" onclick="return viewModel.editMarkerInfo(event)">Edit</button>`;
    }
    content += `
        <button type="delete" name="delete" onclick="return viewModel.deleteMarker(event)">Delete</button>
      </form>
      `;
    return content;
  },

  // on click on marker, show infoWindow
  showMarkerInfo: function(event) {
    var markerPosition = event.latLng;
    var marker = ko.utils.arrayFirst(viewModel.markers(), function(object) {
      return object.position.lat == markerPosition.lat() && object.position.lng == markerPosition.lng();
    });
    if (!marker) { return; }
    viewModel.renderInfoWindow(marker, "display");
  },

  // edit marker infoWindow
  editMarkerInfo: function(event) {
    var markerID = event.target.parentNode.getElementsByClassName('markerID')[0].innerText;
    var matchMarkerID = function(object) {
      return (object.markerID == markerID);
    }
    // find marker in array
    var marker = ko.utils.arrayFirst(viewModel.markers(), matchMarkerID);
    if (!marker) { return; }
    viewModel.renderInfoWindow(marker, "edit");
    // return false to cancel form submission
    return false;
  },

  // save name for new marker
  saveMarkerInfo: function(event) {
    var newName = event.target.form.name.value;
    var markerID = event.target.parentNode.getElementsByClassName('markerID')[0].innerText;
    var matchMarkerID = function(object) {
      return (object.markerID == markerID);
    }

    // find and update marker in array
    var marker = ko.utils.arrayFirst(viewModel.markers(), matchMarkerID);
    if (!marker) { return; }
    marker.placeName = newName;
    viewModel.markers.sort(); // hack to make change persist to localStorage
    viewModel.renderInfoWindow(marker, "display");
    // return false to cancel form submission
    return false;
  },

  // deletes a marker and its associated infoWindow and gmap marker
  deleteMarker: function(event) {
    var markerID = event.target.parentNode.getElementsByClassName('markerID')[0].innerText;
    var matchMarkerID = function(object) {
      return (object.markerID == markerID);
    }
    // find and remove google maps marker
    var markerToRemove = viewModel.gMapMarkers.find(matchMarkerID);
    if (markerToRemove) {
      markerToRemove.setMap(null);
      viewModel.gMapMarkers.pop(matchMarkerID);
    }
    markerToRemove = null;
    // find and remove marker from array
    viewModel.markers.remove(matchMarkerID);
    // return false to cancel form submission
    return false;
  }
};

// initialize viewModel
viewModel.init();
ko.applyBindings(viewModel);

// callback function from initial map call in index.html
function initialMap() {
  viewModel.displayMap();
}

function objCpy(originalObject) {
  var newObject = {};
  for (var prop in originalObject) {
    if (originalObject.hasOwnProperty(prop)) {
        newObject[prop] = originalObject[prop];
    }
  }
  return newObject;
}

function copyAttribs(source, target) {
  if (!source) { return; }
  if (!target) {
    target = {};
  }
  for (var prop in source) {
    if (source.hasOwnProperty(prop)) {
      target[prop] = source[prop];
    }
  }
}

function generateID() {
  return Math.random().toString(36).substr(2, 9);
}
