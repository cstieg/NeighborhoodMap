# Neighborhood Map

A project by Christopher Stieg for the **JavaScript Design Patterns* course,
which is part of the **Full Stack Nanodegree** from
[Udacity.com](https://www.udacity.com/course/full-stack-web-developer-nanodegree--nd004).
It is a webpage that displays a number of markers for locations in a neighborhood
using the Google Maps API, and retrieves info about the locations from Wikipedia
as well as displaying the street view from Google.


## Getting Started
* Get an [API key for Google Maps.](https://developers.google.com/maps/documentation/javascript/get-api-key)
    * Substitute the API key into index.html as follows:
`<script async defer src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap"
  type="text/javascript"></script>``


* Substitute a unique user agent string and email address in the WIKIPEDIA_USER_AGENT_INFO
variable at the top of nhoodmap.js.
    * For more information, see [Wikipedia's API page.](https://www.mediawiki.org/wiki/API:Main_page)


* Open index.html in a web browser.

## License
This project is licensed under the MIT license.
