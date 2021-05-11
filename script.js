const algoliaPlacesApiAppId = 'plU4N8HG6QWK';
const algoliaPlacesApiKey = '1131438afb49f60a48ed468c5af189b8';
const mapboxApiToken = 'pk.eyJ1Ijoia3Jva3JvYiIsImEiOiJja2YzcmcyNDkwNXVpMnRtZGwxb2MzNWtvIn0.69leM_6Roh26Ju7Lqb2pwQ';
const taxiFareApiUrl = 'http://localhost:8000/predict';

const displayMap = (start, stop) => {
  mapboxgl.accessToken = mapboxApiToken;
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
    center: [-74.00597, 40.71427], // starting position [lng, lat]
    zoom: 10 // starting zoom
  });

  function getRoute(end) {
    var url = 'https://api.mapbox.com/directions/v5/mapbox/driving/' + start[0] + ',' + start[1] + ';' + end[0] + ',' + end[1] + '?steps=true&geometries=geojson&access_token=' + mapboxgl.accessToken;

    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.onload = function() {
      var json = JSON.parse(req.response);
      var data = json.routes[0];
      var route = data.geometry.coordinates;
      var geojson = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: route
        }
      };
      // if the route already exists on the map, reset it using setData
      if (map.getSource('route')) {
        map.getSource('route').setData(geojson);
      } else { // otherwise, make a new request
        map.addLayer({
          id: 'route',
          type: 'line',
          source: {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: geojson
              }
            }
          },
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3887be',
            'line-width': 5,
            'line-opacity': 0.75
          }
        });
      }
      // add turn instructions here at the end
    };
    req.send();
  }
  if (start && stop) {
    map.on('load', function() {
      // make an initial directions request that
      // starts and ends at the same location
      getRoute(start);
      // Add starting point to the map
      map.addLayer({
        id: 'point',
        type: 'circle',
        source: {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Point',
                coordinates: start
              }
            }
            ]
          }
        },
        paint: {
          'circle-radius': 10,
          'circle-color': '#3887be'
        }
      });
      // this is where the code from the next step will go
      var coords = stop
      var end = {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: coords
            }
          }
          ]
        };
        if (map.getLayer('end')) {
          map.getSource('end').setData(end);
        } else {
          map.addLayer({
            id: 'end',
            type: 'circle',
            source: {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: [{
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'Point',
                    coordinates: coords
                  }
                }]
              }
            },
            paint: {
              'circle-radius': 10,
              'circle-color': '#f30'
            }
          });
        }
        getRoute(coords);
    });
  }
};

const handleOnChangePickup = (e) => {
  const coordinates = e.suggestion.latlng;
  document.querySelector('#pickup_latitude').value = coordinates.lat;
  document.querySelector('#pickup_longitude').value = coordinates.lng;
};

const pickupAutocomplete = () => {
  const placesAutocompletePickup = places({
    appId: algoliaPlacesApiAppId,
    apiKey: algoliaPlacesApiKey,
    container: document.querySelector('#pickup')
  });
  placesAutocompletePickup.on('change', handleOnChangePickup);
};

const handleOnChangeDropoff = (e) => {
  const coordinates = e.suggestion.latlng;
  document.querySelector('#dropoff_latitude').value = coordinates.lat;
  document.querySelector('#dropoff_longitude').value = coordinates.lng;
  const start = [parseFloat(document.querySelector('#pickup_longitude').value), parseFloat(document.querySelector('#pickup_latitude').value)];
  const stop = [coordinates.lng, coordinates.lat];
  displayMap(start, stop)
};

const dropoffAutocomplete = () => {
  const placesAutocompleteDropoff = places({
    appId: algoliaPlacesApiAppId,
    apiKey: algoliaPlacesApiKey,
    container: document.querySelector('#dropoff')
  });
  placesAutocompleteDropoff.on('change', handleOnChangeDropoff);
};

const initFlatpickr = () => {
  flatpickr("#pickup_datetime", {
    enableTime: true,
    dateFormat: "Y-m-d H:i:S",
    defaultDate: Date.now()
  });
};

const predict = () => {
  form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        "pickup_latitude": parseFloat(document.getElementById('pickup_latitude').value) || 40.747,
        "pickup_longitude": parseFloat(document.getElementById('pickup_longitude').value) || -73.989,
        "dropoff_latitude": parseFloat(document.getElementById('dropoff_latitude').value) || 40.802,
        "dropoff_longitude": parseFloat(document.getElementById('dropoff_longitude').value) || -73.956,
        "passenger_count": parseInt(document.getElementById('passenger_count').value) || 2,
        "pickup_datetime": document.getElementById('pickup_datetime').value
      };
      let query = []
      Object.keys(data).forEach((param) => {
        query.push(`${param}=${data[param]}`)
      })
      const querystring = query.join('&')
      const url = `${taxiFareApiUrl}?${querystring}`
      fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        document.getElementById('fare').classList.remove('d-none');
        const fareResult = document.getElementById('predicted-fare');
        const fare = Math.round(data['prediction'] * 100) / 100
        fareResult.innerText = `$${fare}`;
      })
      .catch((error) => {
        console.error('Error:', error);
      });
    });
  }
};

displayMap();
pickupAutocomplete();
dropoffAutocomplete();
initFlatpickr();
predict();
