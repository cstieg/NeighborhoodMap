/*
 * Uses Knockout.js, which has MVVM structure:
 *  Model - stored data
 *  ViewModel - the data and functions
 *  View - the HTML with bindings to VM data and functions
 */

WIKIPEDIA_USER_AGENT_INFO = 'NeighborHoodMap/1.0 (http://circumspectus.com/; cstieg4899@yahoo.com)';

var viewModel = {
  // Initializes data in Knockout observables, which automatically refreshes html
  // Data is persisted to localStorage by knockout.localStorage.js
  init: function() {
    // location on which the map is centered
    this.mapCenterLocation =  {lat: 42.96469810674499, lng: -85.67106485366821}

    // list of marker locations to show, more can be added by the user
    this.locations = [new Marker('Cathedral of St. Andrew', '265 Sheldon Blvd SE, Grand Rapids, MI 49503', {lat: 42.9586366, lng: -85.66676749999999}),
                      new Marker('First Congregational Church', '101 Fulton St E, Grand Rapids, MI 49503', {lat: 42.963807, lng: -85.666473}),
                      new Marker('DeVos Place', '333 Monroe Ave NW, Grand Rapids, MI 49503', {lat: 42.96922016304754, lng: -85.67314624786377}),
                      new Marker('Gerald Ford Presidential Museum', '303 Pearl St NW, Grand Rapids, MI 49504', {lat: 42.968073978839634, lng: -85.67720174789429}),
                      new Marker('Grand Rapids Art Museum', '101 Monroe Center St NW, Grand Rapids, MI 49503', {lat: 42.96469810674499, lng: -85.67106485366821}),
                      new Marker('Van Andel Arena', '130 Fulton St E, Grand Rapids, MI 49503', {lat: 42.96204438421326, lng: -85.67157983779907}),
                      new Marker('Heartside Park', '301 Ionia Ave SW, Grand Rapids, MI 49503', {lat: 42.95778876771397, lng: -85.67044258117676})
                    ];

    // Google maps object
    this.map = ko.observable();

    // list of marker objects
    this.markers = ko.observableArray(null, {persist: 'markers'});

    // list of marker object filtered by the user to display on the sidebar
    this.filteredMarkers = ko.observableArray([]);
    this.filterMarkers();
    this.markers.subscribe(function(newValue) {
      this.filterMarkers();
    }, this);

    // simple js array to collect google maps objects for later access
    this.gMapMarkers = [];

    // holder for infowindow
    this.infoWindow = null;
  },


//============================MAIN MAP=======================================//

  // displays a map centered at a given location (latlng)
  displayMap: function(location = this.mapCenterLocation) {
    if (!location) { return; }
    var mapElement = $('#map')[0];
    var map = new google.maps.Map(mapElement, {
      zoom: 15,
      center: location
    });

    // rightclick adds a user-defined marker
    map.addListener('rightclick', this.rightClickMap);
    this.map(map);
    this.displayMarkers();
  },

//===========================MARKER DISPLAY===================================//

  // displays all markers based on stored marker locations
  displayMarkers: function() {
    var vm = this;
    this.markers().forEach(function(marker) {
      var gMapMarker = vm.showMarker(marker, vm.map());
      vm.gMapMarkers.push(gMapMarker);
    });
  },

  // returns a Google map marker from the collection corresponding to our marker object
  getGMarker: function(marker) {
    if (!marker) { return; }
    var markerID = marker.markerID;
    var matchMarkerID = function(object) {
      return (object.markerID == markerID);
    };
    return viewModel.gMapMarkers.find(matchMarkerID);
  },

  // adds a marker to the collection
  addMarker: function(marker) {
      // need to keep marker data separate from Google Maps' marker object,
      // as persisting google objects causes error
      var matchingLocation = ko.utils.arrayFirst(viewModel.markers(), function(existingMarker) {
        return marker.position.lat == existingMarker.position.lat && marker.position.lng == existingMarker.position.lng;
      });
      // don't add marker if already existing
      if (matchingLocation) {
        return;
      }

      var gMapMarker = viewModel.showMarker(marker, viewModel.map());
      viewModel.gMapMarkers.push(gMapMarker);
      viewModel.markers.push(marker);
      viewModel.renderInfoWindow(gMapMarker, "edit");
  },

  // displays a marker on the map, returns reference to Google Maps' marker object
  showMarker: function(marker, map) {
    // remove old Google map marker before creating a new one
    viewModel.deleteGMarker(marker.markerID);

    // make a copy of our marker object and use it for Google maps marker
    gMapMarker = new google.maps.Marker(objCpy(marker));

    // place the Google maps marker on the map
    gMapMarker.setMap(map);

    // add listeners to display infowindow when clicked or mousedover
    gMapMarker.addListener('click', viewModel.onClickMarker);
    gMapMarker.addListener('mouseover', viewModel.onClickMarker);

    return gMapMarker;
  },

  // listener for click or mouseover Google maps marker
  // selects marker, causing infowindow popup
  onClickMarker: function(event) {
    var markerPosition = event.latLng;
    var marker = ko.utils.arrayFirst(viewModel.markers(), function(object) {
      return object.position.lat == markerPosition.lat() && object.position.lng == markerPosition.lng();
    });
    viewModel.selectMarker(marker);
  },

  // selects a given marker, causing a popup infowindow
  selectMarker: function(marker) {
    if (!marker) { return; }
    var markerPosition = marker.position;
    var gMapMarker = viewModel.getGMarker(marker);

    // clear listeners upon selection to prevent double selection,
    // restore on mouseout
    google.maps.event.clearListeners(gMapMarker, 'mouseover');
    gMapMarker.addListener('mouseout', function() {
      google.maps.event.clearListeners(gMapMarker, 'mouseout');
      gMapMarker.addListener('mouseover', viewModel.onClickMarker);
    });

    viewModel.animateMarker(gMapMarker);
    viewModel.renderInfoWindow(marker, "display");
    viewModel.retrieveWikipediaPages(markerPosition);
    viewModel.displayStreetview(markerPosition);

  },

  // cause a Google maps marker to bounce once when selected
  animateMarker: function(gMarker) {
    if (!gMarker) { return; }
    gMarker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function () {
      gMarker.setAnimation(null);
    }, 700);
  },

  // adds a marker from a right click event
  rightClickMap: function(result) {
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
          viewModel.addMarker(newMarker);
        } else {
          window.alert('No results found');
        }
      } else {
        window.alert('Geocoder failed due to: ' + status);
      }
    });
  },

  //=================MARKER INFOWINDOW INTERACTION=============================//
  // display infoWindow at a given marker
  renderInfoWindow: function(marker, action) {
    if (viewModel.infoWindow) {
      viewModel.infoWindow.close();
      viewModel.infoWindow = null;
    }
    if (!marker) { return; }
    var gMapMarker = viewModel.getGMarker(marker);
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
        content += `<input type="text" name="name" value="${marker.placeName}" required><br>`;
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
        <div id="wikipediaLinks"></div>
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


  // save name for new marker event handler
  saveMarkerInfo: function(event) {
    var newName = event.target.form.name.value;
    var markerID = event.target.parentNode.getElementsByClassName('markerID')[0].innerText;

    // filter to find correct marker
    var matchMarkerID = function(object) {
      return (object.markerID == markerID);
    }

    // find and update marker in array
    var marker = ko.utils.arrayFirst(viewModel.markers(), matchMarkerID);
    if (!marker) { return; }
    marker.placeName = newName;
    // remove and push to make update and persist to localStorage;
    viewModel.markers.remove(marker);
    viewModel.markers.push(marker);
    viewModel.renderInfoWindow(marker, "display");
    // return false to cancel form submission
    return false;
  },

  // edit marker infoWindow event handler
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

  // deletes a marker and its associated infoWindow and gmap marker
  deleteMarker: function(event) {
    var markerID = event.target.parentNode.getElementsByClassName('markerID')[0].innerText;

    // find and remove google maps marker
    viewModel.deleteGMarker(markerID);

    // find and remove marker from array
    viewModel.markers.remove(matchMarkerID);
    // return false to cancel form submission
    return false;
  },

  // deletes a Google maps marker of a given id from the collection
  deleteGMarker: function(markerID) {
    var matchMarkerID = function(object) {
      return (object.markerID == markerID);
    }
    var markerToRemove = viewModel.gMapMarkers.find(matchMarkerID);
    if (markerToRemove) {
      markerToRemove.setMap(null);
      viewModel.gMapMarkers.pop(markerID);
    }
    markerToRemove = null;
  },


//==============================SIDEBAR=======================================//
  // Collapses or expands the sidebar
  toggleSidebar: function(collapse) {
    if ((collapse && collapse === true) || $('#collapse-button')[0].innerHTML == '&lt;') {
      $('#sidebar').addClass('collapsed-sidebar');
      $('#sidebar').on('click', viewModel.toggleSidebar);
      $('.collapsible').addClass('no-display');
      $('.rotatable').addClass('rotate');
      $('#collapse-button').html('&gt;');
      $('#sidebar .title h1').text('Click to Expand');
      var sidebarHeight = $('#sidebar')[0].clientHeight;
      $('#sidebar .title').width(sidebarHeight);
    }
    else {
      $('#sidebar').removeClass('collapsed-sidebar');
      $('#sidebar').off('click');
      $('.collapsible').removeClass('no-display');
      $('.rotatable').removeClass('rotate');
      $('#collapse-button').html('&lt;');
      $('#sidebar .title h1').text('Neighborhood Map');
      $('#sidebar .title').width('100%');
    }
  },

//============================FILTER MARKERS==================================//
  // update the filteredMarkers collection according to the newly-typed data in filter input
  filterMarkers: function(data, event) {
    var newFilteredMarkers = [];
    if (event) {
      var filter = event.target.value.toUpperCase();
    }
    for (var i=0; i < viewModel.markers().length; i++) {
      if (!filter || viewModel.markers()[i].placeName.toUpperCase().includes(filter)) {
        newFilteredMarkers.push(viewModel.markers()[i]);
      }
    }
    viewModel.filteredMarkers(newFilteredMarkers);
  },

  // select a marker when clicked from the list in sidebar
  clickMarkerName: function(item) {
    var matchMarkerID = function(object) {
      return (object.markerID == item.markerID);
    };
    var marker = ko.utils.arrayFirst(viewModel.markers(), matchMarkerID);
    viewModel.selectMarker(marker);
  },


//==============================STREETVIEW====================================//
  // displays a Google Street View in a window for a given location
  displayStreetview: function(location) {
    if (!location) { return; }
    var mapElement = $('.street-view')[0];
    var streetView = new google.maps.StreetViewPanorama(mapElement, {
      position: location,
      pov: {
        heading: 0,
        pitch: 0
      }
    })
    this.map().setStreetView(streetView);
  },

  //==================RETRIEVE WIKIPEDIA DATA=================================//
  // send ajax request to Wikipedia for info on a given location
  retrieveWikipediaPages: function(location) {
    // get list of Wikipedia pages for the latlng
    var wikiURL = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${location.lat}|${location.lng}&gsradius=100&gslimit=10&format=json`;
    $.ajax({
      url: wikiURL,
      type: 'GET',
      dataType: 'jsonp',
      headers: {
        'Api-User-Agent': 'NeighborHoodMap/1.0 (http://circumspectus.com/; cstieg4899@yahoo.com)'
      },
      success: function(data) {
        // display Wikipedia links in infowindow
        var wikiPages = data.query.geosearch;
        if (wikiPages.length == 0) { return };
        var $wikipediaLinks = $("#wikipediaLinks");
        $wikipediaLinks.empty();
        for (var i = 0; i < wikiPages.length; i++) {
          $wikipediaLinks.append(`<p><a href="https://en.wikipedia.org/wiki/${wikiPages[i].title}">${wikiPages[i].title}</a></p>`);
        }

        // display the extract of the first Wikipedia page in the sidebar
        $.ajax({
          url: `https:/en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=explaintext&titles=${wikiPages[0].title}`,
          type: 'GET',
          dataType: 'jsonp',
          headers: {
            'Api-User-Agent': WIKIPEDIA_USER_AGENT_INFO
          },
          success: function(data) {
            var pageIDs = Object.keys(data.query.pages);
            var pageContent = data.query.pages[pageIDs[0]].extract;
            $('.media-info-content').html(pageContent);
          }
        });
      }
    });
  },
};

//========================INITIALIZE MAPS=====================================//

// initialize viewModel
viewModel.init();
ko.applyBindings(viewModel);

// callback function from initial map call in index.html
function initialMap() {
  viewModel.displayMap();
  viewModel.locations.forEach(function(marker) {
    viewModel.addMarker(marker);
  });
  viewModel.displayStreetview();

  // set initial display for mobile screens
  if (window.innerWidth < 600) {
    viewModel.toggleSidebar(true);
    viewModel.map().zoom = 14;
  }
}






//========================MISC FUNCTIONS======================================//
// Copy the properties in one object to another new one
function objCpy(originalObject) {
  var newObject = {};
  for (var prop in originalObject) {
    if (originalObject.hasOwnProperty(prop)) {
        newObject[prop] = originalObject[prop];
    }
  }
  return newObject;
}

// Generate random id
function generateID() {
  return Math.random().toString(36).substr(2, 9);
}

// Class equivalent for marker
function Marker(placeName, address, position) {
  this.markerID = generateID();
  this.placeName = placeName;
  this.address = address;
  this.position = position;
}
