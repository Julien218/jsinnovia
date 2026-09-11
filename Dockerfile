FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY pilotya.css /usr/share/nginx/html/pilotya.css
COPY pilotya-mobile.css /usr/share/nginx/html/pilotya-mobile.css
COPY pilotya-brand.css /usr/share/nginx/html/pilotya-brand.css
COPY pilotya.js /usr/share/nginx/html/pilotya.js
COPY assets /usr/share/nginx/html/assets
COPY manifest.webmanifest /usr/share/nginx/html/manifest.webmanifest
COPY robots.txt /usr/share/nginx/html/robots.txt
COPY sitemap.xml /usr/share/nginx/html/sitemap.xml
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["sh", "-c", "sed -i \"s/listen 80;/listen ${PORT:-80};/\" /etc/nginx/conf.d/default.conf && nginx -g \"daemon off;\""]
