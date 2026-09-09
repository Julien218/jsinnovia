FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY pilotya.css /usr/share/nginx/html/pilotya.css
COPY pilotya.js /usr/share/nginx/html/pilotya.js
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["sh", "-c", "sed -i \"s/listen 80;/listen ${PORT:-80};/\" /etc/nginx/conf.d/default.conf && nginx -g \"daemon off;\""]
