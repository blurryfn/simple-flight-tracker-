import { Hono } from 'hono';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();


const app = new Hono();

const OPEN_SKY_API_URL = process.env.OPEN_SKY_API_URL;


Bun.serve({
  port: 3551,
  fetch: app.fetch,
});

app.get('/planes', async (ctx) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Plane Tracker</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.1/dist/MarkerCluster.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.1/dist/MarkerCluster.Default.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet.markercluster@1.5.1/dist/leaflet.markercluster.js"></script>
        <style>
          #map {
            height: 100vh; /* Fullscreen map */
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Initialize the map
          const map = L.map('map').setView([20, 0], 2); // Center map globally
  
          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(map);
  
          
          const planeMarkers = {};
  
          
          const markers = L.markerClusterGroup();
  
          
          function getPlaneIcon(heading) {
            return L.icon({
              iconUrl: 'https://th.bing.com/th/id/OIP.0ubB38dDR6Hhi77BXteYvAHaHa?w=5000&h=5000&rs=1&pid=ImgDetMain', 
              iconSize: [40, 40], 
              iconAnchor: [20, 20], 
              popupAnchor: [0, -20], 
              rotationAngle: heading 
            });
          }
  
        
          async function fetchPlanes() {
            try {
              const response = await fetch('/api/planes');
              const data = await response.json();
  
            
              data.planes.forEach(function(plane) {
                if (plane.latitude && plane.longitude) {
                 
                  const heading = plane.heading || 0;
  
                  
                  if (planeMarkers[plane.icao24]) {
                    
                    planeMarkers[plane.icao24].setLatLng([plane.latitude, plane.longitude])
                      .setIcon(getPlaneIcon(heading)); 
                  } else {
                    
                    const marker = L.marker([plane.latitude, plane.longitude], {
                      icon: getPlaneIcon(heading) 
                    });
  
                    
                    marker.bindPopup('<strong>Flight:</strong> ' + (plane.callsign || 'N/A') + '<br />' +
                      '<strong>Country:</strong> ' + (plane.originCountry || 'N/A') + '<br />' +
                      '<strong>Altitude:</strong> ' + (plane.altitude || 'N/A') + ' m<br />' +
                      '<strong>Velocity:</strong> ' + (plane.velocity || 'N/A') + ' m/s');
  
                   
                    markers.addLayer(marker);
  
                    
                    planeMarkers[plane.icao24] = marker;
                  }
                }
              });
  
              map.addLayer(markers);
            } catch (error) {
              console.error('Error fetching planes:', error);
            }
          }
  
          
          fetchPlanes();
  
          
          setInterval(fetchPlanes, 5000); 
        </script>
      </body>
      </html>
    `;
  
    return ctx.html(htmlContent);
  });
  
  

app.get('/api/planes', async (ctx) => {
  try {
    const response = await axios.get(OPEN_SKY_API_URL!);
    const planes = response.data.states;

   
    const planeData = planes.map((plane: any) => ({
      icao24: plane[0], 
      callsign: plane[1], 
      originCountry: plane[2], 
      latitude: plane[6], 
      longitude: plane[5], 
      altitude: plane[7], 
      velocity: plane[9], 
    }));

    return ctx.json({ planes: planeData });
  } catch (error) {
    console.error('Error fetching flight data:', error);
    return ctx.json({ error: 'Failed to fetch flight data' }, 500);
  }
});



console.log('Celestix started on port 3551');
