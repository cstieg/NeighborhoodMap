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
    //this.address = ko.observable(null, {persist: 'address'});
    this.address = '143 Bostwick Ave NE, Grand Rapids, MI 49503';
    this.locations = [new Marker('Cathedral of St. Andrew', '265 Sheldon Blvd SE, Grand Rapids, MI 49503', {lat: 42.9586366, lng: -85.66676749999999}),
                      new Marker('First Congregational Church', '101 Fulton St E, Grand Rapids, MI 49503', {lat: 42.963807, lng: -85.666473})
                    ];


                    /*
    this.locations = ['303 Monroe Ave NW, Grand Rapids, MI 49503',
                      '143 Bostwick Ave NE, Grand Rapids, MI 49503',
                      '101 Fulton St E, Grand Rapids, MI 49503',
                      '130 Fulton W, Grand Rapids, MI 49503',
                      'Sneden Hall, 415 Fulton St E, Grand Rapids, MI 49503',
                    '265 Sheldon Blvd SE, Grand Rapids, MI 49503']; */
    this.locationCoords = ko.observable(null, {persist: 'locationCoords'});
    this.map = ko.observable();
    this.markers = ko.observableArray(null, {persist: 'markers'});
    this.filteredMarkers = ko.observableArray([]);
    this.filterMarkers();
    this.markers.subscribe(function(newValue) {
      this.filterMarkers();
    }, this);
    //this.markers.removeAll();

    // simple js arrays to collect google maps objects for later access
    this.gMapMarkers = [];
    this.infoWindow = null;
  },


  //============================MAIN MAP=====================================//


/*
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

  addAddressToMarkers: function(address) {
    var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + address;
    $.ajax({
      url: url,
      context: this,
      success: function(result) {
        // on success inputting address, display map centered on lat/long of address
        this.addMarker(result.results[0].geometry.location);
      }
    });
  },

*/
  // displays a map centered at a given location
  displayMap: function(location = viewModel.locationCoords()) {
    if (!location) { return; }
    var mapElement = $('#map')[0];
    var map = new google.maps.Map(mapElement, {
      zoom: 16,
      center: location
    });
    /*
    var marker = new google.maps.Marker({
      position: location,
      map: map,
      animation: google.maps.Animation.DROP
    });*/
    // rightclick adds a user-defined marker
    map.addListener('rightclick', this.rightClickMap);
    this.map(map);
    this.displayMarkers();
  },


  displayStreetview: function(location = viewModel.locationCoords()) {
    if (!location) { return; }
    var mapElement = $('.street-view')[0];
    var streetView = new google.maps.StreetViewPanorama(mapElement, {
      position: location,
      pov: {
        heading: 0,
        pitch: 0
      }
    })
    viewModel.map().setStreetView(streetView);
  },

  //============================SEARCH MARKERS================================//
  /*searchMarkers: function(formData) {
    var searchText = formData.searchText.value;
    var matchPlaceName = function(object) {
      return (object.placeName == searchText);
    };
    var marker = ko.utils.arrayFirst(viewModel.markers(), matchPlaceName);
    if (!marker) {
      alert(searchText + " not found! Please try again.");
      return;
    }
    viewModel.renderInfoWindow(marker, "display");
    return false;
  },
*/

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



  addMarker: function(marker) {
      // need to keep marker data separate from Google Maps' marker object,
      // as persisting google objects causes error
      var matchingLocation = ko.utils.arrayFirst(viewModel.markers(), function(existingMarker) {
        return marker.position.lat == existingMarker.position.lat && marker.position.lng == existingMarker.position.lng;
      });
      if (matchingLocation) {
        return;
      }

      var gMapMarker = viewModel.showMarker(marker, viewModel.map());
      viewModel.gMapMarkers.push(gMapMarker);
      viewModel.markers.push(marker);
      viewModel.renderInfoWindow(marker, "edit");
  },

  // displays a marker on the map, returns reference to Google Maps' marker object
  showMarker: function(marker, map) {
    var gMapMarker = new google.maps.Marker(objCpy(marker));
    gMapMarker.setMap(map);
    gMapMarker.addListener('click', viewModel.onClickMarker);
    gMapMarker.addListener('mouseover', viewModel.onClickMarker);
    return gMapMarker;
  },

  clickMarkerName: function(item) {
    var markerID = item.markerID;
    var matchMarkerID = function(object) {
      return (object.markerID == markerID);
    };
    var marker = ko.utils.arrayFirst(viewModel.markers(), matchMarkerID);
    viewModel.selectMarker(marker);
  },

  selectMarker: function(marker) {
    if (!marker) { return; }
    var markerPosition = marker.position;
    $('.media-info')[0].innerHTML = "";
    viewModel.renderInfoWindow(marker, "display");
    viewModel.displayStreetview(markerPosition);
    viewModel.retrieveWikipediaPages(markerPosition);
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

  // on click on marker, show infoWindow
  onClickMarker: function(event) {
    var markerPosition = event.latLng;
    var marker = ko.utils.arrayFirst(viewModel.markers(), function(object) {
      return object.position.lat == markerPosition.lat() && object.position.lng == markerPosition.lng();
    });
    viewModel.selectMarker(marker);
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
    // remove and push to make update and persist to localStorage;
    viewModel.markers.remove(marker);
    viewModel.markers.push(marker);
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
  },

  //==================RETRIEVE MEDIA DATA=====================================//
  retrieveWikipediaPages: function(location) {
    var wikiURL = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${location.lat}|${location.lng}&gsradius=100&gslimit=10&format=json`;
    $.ajax({
      url: wikiURL,
      type: 'GET',
      dataType: 'jsonp',
      headers: {
        'Api-User-Agent': 'NeighborHoodMap/1.0 (http://circumspectus.com/; cstieg4899@yahoo.com)'
      },
      success: function(data) {
        var wikiPages = data.query.geosearch;
        if (wikiPages.length == 0) { return };
        var $wikipediaLinks = $("#wikipediaLinks");
        $wikipediaLinks.innerHTML = "";
        for (var i = 0; i < wikiPages.length; i++) {
          $wikipediaLinks.append(`<p><a href="https://en.wikipedia.org/wiki/${wikiPages[i].title}">${wikiPages[i].title}</a></p>`);
        }

        $.ajax({
          url: `https:/en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=explaintext&titles=${wikiPages[0].title}`,
          type: 'GET',
          dataType: 'jsonp',
          headers: {
            'Api-User-Agent': 'NeighborHoodMap/1.0 (http://circumspectus.com/; cstieg4899@yahoo.com)'
          },
          success: function(data) {
            var pageIDs = Object.keys(data.query.pages);
            var pageContent = data.query.pages[pageIDs[0]].extract;
            $('.media-info').html(pageContent);
          }
        });


      }
    });
  },


};

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

function toggleSidebar() {
  if ($('#collapse-button')[0].innerHTML == '&gt;') {
    $('#sidebar').removeClass('collapsed-sidebar');
    $('#sidebar').off('click');
    $('.collapsible').removeClass('no-display');
    $('.rotatable').removeClass('rotate');
    $('#collapse-button').html('&lt;');
    $('#sidebar .title h1').text('Neighborhood Map');
    $('#sidebar .title').width('100%');
  }
  else {
    $('#sidebar').addClass('collapsed-sidebar');
    $('#sidebar').on('click', toggleSidebar);
    $('.collapsible').addClass('no-display');
    $('.rotatable').addClass('rotate');
    $('#collapse-button').html('&gt;');
    $('#sidebar .title h1').text('Click to Expand');
    var sidebarHeight = $('#sidebar')[0].clientHeight;
    $('#sidebar .title').width(sidebarHeight);
  }
}

function Marker(placeName, address, position) {
  this.markerID = generateID();
  this.placeName = placeName;
  this.address = address;
  this.position = position;
}
